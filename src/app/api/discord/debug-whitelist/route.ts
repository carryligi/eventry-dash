import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase/server'
import {
  computePermissions,
  fetchBotRoleIds,
  VIEW_CHANNEL,
  channelTypeLabel,
  type DiscordChannel,
  type DiscordRole,
} from '@/lib/discord/permissions'

/**
 * Admin-only diagnostic endpoint.
 *
 * For each whitelisted category ID in app_settings.allowed_category_ids,
 * reports exactly why (or why not) it appears in the keyword channel picker.
 * Use this to debug cases where a category is expected to show up but
 * doesn't — the response contains raw Discord data (permission_overwrites,
 * channel type, bot roles, computed permission bits) so any filter step
 * can be traced.
 *
 * TEMPORARY — delete once the underlying filtering bug is fixed.
 */

const DISCORD_API = 'https://discord.com/api/v10'
const CATEGORY_TYPE = 4
const TEXT_CHANNEL_TYPES = new Set([0, 2, 5])

interface WhitelistReportEntry {
  id: string
  present_in_discord: boolean
  name: string | null
  type: number | null
  type_label: string
  parent_id: string | null
  position: number | null
  permission_overwrites:
    | Array<{ id: string; type: number; allow: string; deny: string }>
    | null
  bot_computed_permissions_hex: string | null
  bot_can_view: boolean | null
  bot_matching_role_overwrites: string[]
  filtered_reason: string
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.accessLevel !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
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
  const whitelistIds = (settingsMap.get('allowed_category_ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (!botToken || !guildId) {
    return NextResponse.json(
      { error: 'discord_bot_token or guild_id not configured in app_settings' },
      { status: 500 },
    )
  }

  // Parallel fetches against Discord API. Bot roles use the 2-step helper
  // because /guilds/{id}/members/@me only works with OAuth Bearer tokens.
  const [channelsRes, botMember, rolesRes] = await Promise.all([
    fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${botToken}` },
    }),
    fetchBotRoleIds(botToken, guildId),
    fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
    }),
  ])

  if (!channelsRes.ok) {
    const body = await channelsRes.text().catch(() => '')
    return NextResponse.json(
      {
        error: `Discord GET /guilds/${guildId}/channels failed`,
        status: channelsRes.status,
        body: body.slice(0, 500),
      },
      { status: 502 },
    )
  }

  const rawChannels: DiscordChannel[] = await channelsRes.json()
  const rawById = new Map(rawChannels.map((c) => [c.id, c]))

  const botRoleIds: string[] = botMember.botRoleIds
  const botMemberFetchOk = botMember.ok
  const botMemberError = botMember.error ?? null
  const botUserId = botMember.botUserId
  const rolePermsMap = new Map<string, bigint>()
  let rolesFetchOk = false

  if (rolesRes.ok) {
    rolesFetchOk = true
    const guildRoles: DiscordRole[] = await rolesRes.json()
    for (const role of guildRoles) {
      rolePermsMap.set(role.id, BigInt(role.permissions))
    }
  }

  const totalCategoriesInGuild = rawChannels.filter(
    (c) => c.type === CATEGORY_TYPE,
  ).length

  const whitelistReport: WhitelistReportEntry[] = whitelistIds.map((id) => {
    const ch = rawById.get(id)

    if (!ch) {
      return {
        id,
        present_in_discord: false,
        name: null,
        type: null,
        type_label: 'MISSING',
        parent_id: null,
        position: null,
        permission_overwrites: null,
        bot_computed_permissions_hex: null,
        bot_can_view: null,
        bot_matching_role_overwrites: [],
        filtered_reason: 'not_in_discord',
      }
    }

    const perms = computePermissions(ch, guildId, botRoleIds, rolePermsMap)
    const canView = (perms & VIEW_CHANNEL) !== BigInt(0)
    const matchingOverwrites = (ch.permission_overwrites ?? [])
      .filter((o) => o.type === 0 && botRoleIds.includes(o.id))
      .map((o) => o.id)

    let reason: string
    if (!canView) {
      reason = 'bot_cannot_view'
    } else if (ch.type !== CATEGORY_TYPE) {
      reason = `wrong_type (expected GUILD_CATEGORY, got ${channelTypeLabel(ch.type)})`
    } else {
      reason = 'passed'
    }

    return {
      id,
      present_in_discord: true,
      name: ch.name,
      type: ch.type,
      type_label: channelTypeLabel(ch.type),
      parent_id: ch.parent_id,
      position: ch.position,
      permission_overwrites: ch.permission_overwrites ?? [],
      bot_computed_permissions_hex: '0x' + perms.toString(16),
      bot_can_view: canView,
      bot_matching_role_overwrites: matchingOverwrites,
      filtered_reason: reason,
    }
  })

  // Bonus: sample the 10 categories Discord DID return, so we can compare
  // names/IDs against the user's intended list and spot typos quickly.
  const guildCategoriesSample = rawChannels
    .filter((c) => c.type === CATEGORY_TYPE)
    .slice(0, 20)
    .map((c) => ({ id: c.id, name: c.name, position: c.position }))

  return NextResponse.json(
    {
      guild_id: guildId,
      bot_user_id: botUserId,
      bot_member_fetch_ok: botMemberFetchOk,
      bot_member_fetch_error: botMemberError,
      roles_fetch_ok: rolesFetchOk,
      bot_role_ids: botRoleIds,
      bot_role_count: botRoleIds.length,
      total_raw_channels_fetched: rawChannels.length,
      total_categories_in_guild: totalCategoriesInGuild,
      total_text_channels_in_guild: rawChannels.filter((c) =>
        TEXT_CHANNEL_TYPES.has(c.type),
      ).length,
      total_whitelisted: whitelistIds.length,
      total_appearing_in_picker: whitelistReport.filter(
        (r) => r.filtered_reason === 'passed',
      ).length,
      whitelist_report: whitelistReport,
      guild_categories_sample: guildCategoriesSample,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
