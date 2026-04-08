import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase/server'
import type { DiscordCategory, DiscordTextChannel, DiscordChannelsResponse } from '@/types'

interface PermissionOverwrite {
  id: string
  type: number // 0 = role, 1 = member
  allow: string
  deny: string
}

interface DiscordChannel {
  id: string
  name: string
  type: number
  parent_id: string | null
  position: number
  permission_overwrites?: PermissionOverwrite[]
}

interface DiscordRole {
  id: string
  permissions: string
}

const DISCORD_API = 'https://discord.com/api/v10'
const TEXT_CHANNEL_TYPES = new Set([0, 2, 5]) // text, voice, announcement
const CATEGORY_TYPE = 4
const VIEW_CHANNEL = BigInt(1 << 10) // 0x400
const ADMINISTRATOR = BigInt(1 << 3) // 0x8

/**
 * Compute effective permissions for the bot on a specific channel.
 * Follows Discord's layered permission model:
 * 1. @everyone server-wide permissions
 * 2. @everyone channel overwrites
 * 3. Bot's roles server-wide permissions (OR'd together)
 * 4. Bot's roles channel overwrites (deny OR'd, then allow OR'd)
 */
function computePermissions(
  channel: DiscordChannel,
  guildId: string,
  botRoleIds: string[],
  rolePermsMap: Map<string, bigint>,
): bigint {
  // 1. Start with @everyone server-wide permissions
  let permissions = rolePermsMap.get(guildId) ?? BigInt(0)

  // Admin override — skip channel overwrites
  if ((permissions & ADMINISTRATOR) !== BigInt(0)) return permissions

  // 2. Apply @everyone channel overwrites
  const everyoneOw = channel.permission_overwrites?.find((o) => o.id === guildId && o.type === 0)
  if (everyoneOw) {
    permissions &= ~BigInt(everyoneOw.deny)
    permissions |= BigInt(everyoneOw.allow)
  }

  // 3. OR in bot's roles server-wide permissions
  for (const roleId of botRoleIds) {
    permissions |= rolePermsMap.get(roleId) ?? BigInt(0)
  }

  // Admin override after role merge
  if ((permissions & ADMINISTRATOR) !== BigInt(0)) return permissions

  // 4. Apply bot's roles channel overwrites
  let roleDeny = BigInt(0)
  let roleAllow = BigInt(0)
  for (const roleId of botRoleIds) {
    const ow = channel.permission_overwrites?.find((o) => o.id === roleId && o.type === 0)
    if (ow) {
      roleDeny |= BigInt(ow.deny)
      roleAllow |= BigInt(ow.allow)
    }
  }
  permissions &= ~roleDeny
  permissions |= roleAllow

  return permissions
}

function botCanView(
  channel: DiscordChannel,
  guildId: string,
  botRoleIds: string[],
  rolePermsMap: Map<string, bigint>,
): boolean {
  const perms = computePermissions(channel, guildId, botRoleIds, rolePermsMap)
  return (perms & VIEW_CHANNEL) !== BigInt(0)
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerClient()

  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['discord_bot_token', 'guild_id', 'allowed_category_ids'])

  const settingsMap = new Map<string, string>(
    (settings ?? []).map((s) => [s.key as string, s.value as string]),
  )
  const botToken = settingsMap.get('discord_bot_token')
  const guildId = settingsMap.get('guild_id')
  const allowedCategoryIds = new Set(
    (settingsMap.get('allowed_category_ids') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )

  if (!botToken) {
    return NextResponse.json(
      { error: 'Discord Bot Token not configured. An admin needs to set it in Settings.' },
      { status: 500 }
    )
  }

  if (!guildId) {
    return NextResponse.json(
      { error: 'Guild ID not configured. An admin needs to set it in Settings.' },
      { status: 500 }
    )
  }

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${botToken}` },
  })

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        { error: 'Bot does not have access to this server. Ensure it has been invited with View Channels permission.' },
        { status: 403 }
      )
    }
    if (res.status === 429) {
      return NextResponse.json(
        { error: 'Discord rate limit hit. Try again in a few seconds.' },
        { status: 429 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch channels from Discord.' },
      { status: 502 }
    )
  }

  const rawChannels: DiscordChannel[] = await res.json()

  // Fetch bot's own roles and guild roles in parallel
  const [memberRes, rolesRes] = await Promise.all([
    fetch(`${DISCORD_API}/guilds/${guildId}/members/@me`, {
      headers: { Authorization: `Bot ${botToken}` },
    }),
    fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
    }),
  ])

  let botRoleIds: string[] = []
  const rolePermsMap = new Map<string, bigint>()

  if (memberRes.ok) {
    const botMember = await memberRes.json()
    botRoleIds = botMember.roles ?? []
  }

  if (rolesRes.ok) {
    const guildRoles: DiscordRole[] = await rolesRes.json()
    for (const role of guildRoles) {
      rolePermsMap.set(role.id, BigInt(role.permissions))
    }
  }

  // Separate categories and channels, filtering by bot's effective permissions
  // AND by the allowed_category_ids whitelist (only channels inside whitelisted
  // categories are returned; uncategorized channels are dropped entirely).
  const categoryMap = new Map<string, DiscordCategory>()
  const textChannels: DiscordTextChannel[] = []

  for (const ch of rawChannels) {
    // Skip channels the bot cannot view
    if (rolePermsMap.size > 0 && !botCanView(ch, guildId, botRoleIds, rolePermsMap)) continue

    if (ch.type === CATEGORY_TYPE) {
      if (!allowedCategoryIds.has(ch.id)) continue
      categoryMap.set(ch.id, {
        id: ch.id,
        name: ch.name,
        position: ch.position,
        channels: [],
      })
    } else if (TEXT_CHANNEL_TYPES.has(ch.type)) {
      if (!ch.parent_id || !allowedCategoryIds.has(ch.parent_id)) continue
      textChannels.push({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        parent_id: ch.parent_id,
        position: ch.position,
      })
    }
  }

  // Group channels into their (whitelisted) categories.
  // Uncategorized is always empty now because non-whitelisted channels were
  // already filtered out above, but we keep the field for response-shape compat.
  const uncategorized: DiscordTextChannel[] = []

  for (const ch of textChannels) {
    if (ch.parent_id && categoryMap.has(ch.parent_id)) {
      categoryMap.get(ch.parent_id)!.channels.push(ch)
    }
  }

  // Sort everything by position
  const categories = Array.from(categoryMap.values())
    .sort((a, b) => a.position - b.position)
    .map((cat) => ({
      ...cat,
      channels: cat.channels.sort((a, b) => a.position - b.position),
    }))

  uncategorized.sort((a, b) => a.position - b.position)

  const response: DiscordChannelsResponse = { categories, uncategorized }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'private, max-age=60' },
  })
}
