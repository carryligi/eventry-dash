/**
 * Discord permission computation helpers for the bot.
 *
 * Extracted from src/app/api/discord/channels/route.ts so both the picker
 * API and the diagnostic endpoint (/api/discord/debug-whitelist) can share
 * the same logic.
 */

export interface PermissionOverwrite {
  id: string
  type: number // 0 = role, 1 = member
  allow: string
  deny: string
}

export interface DiscordChannel {
  id: string
  name: string
  type: number
  parent_id: string | null
  position: number
  permission_overwrites?: PermissionOverwrite[]
}

export interface DiscordRole {
  id: string
  permissions: string
}

// Discord permission bitflags (see https://discord.com/developers/docs/topics/permissions)
export const VIEW_CHANNEL = BigInt(1 << 10) // 0x400
export const ADMINISTRATOR = BigInt(1 << 3) // 0x8

/**
 * Compute effective permissions for the bot on a specific channel.
 * Follows Discord's layered permission model:
 * 1. @everyone server-wide permissions
 * 2. @everyone channel overwrites
 * 3. Bot's roles server-wide permissions (OR'd together)
 * 4. Bot's roles channel overwrites (deny OR'd, then allow OR'd)
 *
 * NOTE: Member-level overwrites (type === 1) targeting the bot user are
 * currently NOT applied. In practice the bot never has member-level
 * overwrites because Discord servers configure bots via role overwrites.
 */
export function computePermissions(
  channel: DiscordChannel,
  guildId: string,
  botRoleIds: string[],
  rolePermsMap: Map<string, bigint>,
): bigint {
  // 1. Start with @everyone server-wide permissions
  let permissions = rolePermsMap.get(guildId) ?? BigInt(0)

  // Admin override — skip channel overwrites entirely
  if ((permissions & ADMINISTRATOR) !== BigInt(0)) return permissions

  // 2. Apply @everyone channel overwrites
  const everyoneOw = channel.permission_overwrites?.find(
    (o) => o.id === guildId && o.type === 0,
  )
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
    const ow = channel.permission_overwrites?.find(
      (o) => o.id === roleId && o.type === 0,
    )
    if (ow) {
      roleDeny |= BigInt(ow.deny)
      roleAllow |= BigInt(ow.allow)
    }
  }
  permissions &= ~roleDeny
  permissions |= roleAllow

  return permissions
}

export function botCanView(
  channel: DiscordChannel,
  guildId: string,
  botRoleIds: string[],
  rolePermsMap: Map<string, bigint>,
): boolean {
  const perms = computePermissions(channel, guildId, botRoleIds, rolePermsMap)
  return (perms & VIEW_CHANNEL) !== BigInt(0)
}

// Human-readable Discord channel type labels — used in the diagnostic endpoint
// and any other debugging context. Source: Discord API docs.
export const CHANNEL_TYPE_LABELS: Record<number, string> = {
  0: 'GUILD_TEXT',
  1: 'DM',
  2: 'GUILD_VOICE',
  3: 'GROUP_DM',
  4: 'GUILD_CATEGORY',
  5: 'GUILD_ANNOUNCEMENT',
  10: 'ANNOUNCEMENT_THREAD',
  11: 'PUBLIC_THREAD',
  12: 'PRIVATE_THREAD',
  13: 'GUILD_STAGE_VOICE',
  14: 'GUILD_DIRECTORY',
  15: 'GUILD_FORUM',
  16: 'GUILD_MEDIA',
}

export function channelTypeLabel(type: number | null | undefined): string {
  if (type == null) return 'UNKNOWN'
  return CHANNEL_TYPE_LABELS[type] ?? `UNKNOWN(${type})`
}

const DISCORD_API = 'https://discord.com/api/v10'

export interface BotMemberLookup {
  ok: boolean
  botUserId: string | null
  botRoleIds: string[]
  error?: string
}

/**
 * Fetch the bot's guild member object (including its role IDs) in two steps:
 *
 *   1. GET /users/@me → resolve the bot's user ID
 *   2. GET /guilds/{guildId}/members/{botUserId} → read the member's roles
 *
 * NOTE: Discord's `GET /guilds/{guildId}/members/@me` endpoint only accepts
 * Bearer (OAuth2) tokens with the `guilds.members.read` scope — it returns
 * 401 for Bot tokens. Using the explicit bot user ID is the documented path
 * for bot clients.
 */
export async function fetchBotRoleIds(
  botToken: string,
  guildId: string,
): Promise<BotMemberLookup> {
  // Step 1: bot user ID
  const meRes = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bot ${botToken}` },
  })
  if (!meRes.ok) {
    return {
      ok: false,
      botUserId: null,
      botRoleIds: [],
      error: `users/@me returned ${meRes.status}`,
    }
  }
  const me = (await meRes.json()) as { id?: string }
  const botUserId = me.id ?? null
  if (!botUserId) {
    return {
      ok: false,
      botUserId: null,
      botRoleIds: [],
      error: 'users/@me did not return an id',
    }
  }

  // Step 2: bot's guild member object
  const memberRes = await fetch(
    `${DISCORD_API}/guilds/${guildId}/members/${botUserId}`,
    { headers: { Authorization: `Bot ${botToken}` } },
  )
  if (!memberRes.ok) {
    return {
      ok: false,
      botUserId,
      botRoleIds: [],
      error: `guilds/${guildId}/members/${botUserId} returned ${memberRes.status}`,
    }
  }
  const member = (await memberRes.json()) as { roles?: unknown }
  const botRoleIds = Array.isArray(member.roles)
    ? (member.roles as unknown[]).filter(
        (r): r is string => typeof r === 'string',
      )
    : []

  return { ok: true, botUserId, botRoleIds }
}
