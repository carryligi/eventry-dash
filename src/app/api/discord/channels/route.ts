import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase/server'
import type { DiscordCategory, DiscordTextChannel, DiscordChannelsResponse } from '@/types'

interface DiscordChannel {
  id: string
  name: string
  type: number
  parent_id: string | null
  position: number
}

const DISCORD_API = 'https://discord.com/api/v10'
const TEXT_CHANNEL_TYPES = new Set([0, 2, 5]) // text, voice, announcement
const CATEGORY_TYPE = 4

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerClient()

  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['discord_bot_token', 'guild_id'])

  const settingsMap = new Map(settings?.map((s) => [s.key, s.value]) ?? [])
  const botToken = settingsMap.get('discord_bot_token')
  const guildId = settingsMap.get('guild_id')

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

  // Separate categories and channels
  const categoryMap = new Map<string, DiscordCategory>()
  const textChannels: DiscordTextChannel[] = []

  for (const ch of rawChannels) {
    if (ch.type === CATEGORY_TYPE) {
      categoryMap.set(ch.id, {
        id: ch.id,
        name: ch.name,
        position: ch.position,
        channels: [],
      })
    } else if (TEXT_CHANNEL_TYPES.has(ch.type)) {
      textChannels.push({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        parent_id: ch.parent_id,
        position: ch.position,
      })
    }
  }

  // Group channels into categories
  const uncategorized: DiscordTextChannel[] = []

  for (const ch of textChannels) {
    if (ch.parent_id && categoryMap.has(ch.parent_id)) {
      categoryMap.get(ch.parent_id)!.channels.push(ch)
    } else {
      uncategorized.push(ch)
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
