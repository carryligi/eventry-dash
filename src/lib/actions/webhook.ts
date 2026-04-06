'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

function isValidDiscordWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'discord.com' || parsed.hostname === 'discordapp.com') &&
      parsed.pathname.startsWith('/api/webhooks/')
    )
  } catch {
    return false
  }
}

export async function setWebhookUrl(url: string) {
  if (!isValidDiscordWebhookUrl(url)) {
    throw new Error('Invalid Discord webhook URL')
  }

  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  await supabase.from('webhook_settings').upsert(
    {
      user_id: profile.id,
      webhook_url: url,
      is_active: true,
    },
    { onConflict: 'user_id' }
  )
  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard')
}

export async function removeWebhookUrl() {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  await supabase.from('webhook_settings').delete().eq('user_id', profile.id)
  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard')
}

export async function toggleWebhook(isActive: boolean) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  await supabase
    .from('webhook_settings')
    .update({ is_active: isActive })
    .eq('user_id', profile.id)
  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard')
}

export async function testWebhook(): Promise<{ success: boolean; error?: string }> {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  const { data: settings } = await supabase
    .from('webhook_settings')
    .select('webhook_url')
    .eq('user_id', profile.id)
    .maybeSingle()

  if (!settings?.webhook_url) {
    return { success: false, error: 'No webhook URL configured' }
  }

  try {
    const now = new Date()
    const timestamp = now.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Berlin',
    })

    const res = await fetch(settings.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Captain Hook',
        embeds: [
          {
            title: '\u{1F680} Autostart Triggered',
            description:
              'This is a **test notification** from your Eventry Autostart webhook.',
            color: 5763719,
            fields: [
              { name: 'Keyword', value: 'test-keyword', inline: true },
              { name: 'Status', value: '\u2705 200 OK', inline: true },
              {
                name: 'Product',
                value: 'Test Product \u2013 Webhook Verification',
                inline: false,
              },
              {
                name: 'Price Breaks',
                value: '85.00: 9, 95.00: 6',
                inline: true,
              },
              { name: 'Stock', value: '15', inline: true },
              {
                name: 'Product Link',
                value: 'https://example.com/product/test',
                inline: false,
              },
              {
                name: 'Message',
                value: '[Jump to original message](https://discord.com)',
                inline: false,
              },
            ],
            footer: {
              text: `Eventry Autostart \u2022 ${timestamp} CEST \u2022 ${now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })}`,
            },
            timestamp: now.toISOString(),
          },
        ],
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `Discord returned ${res.status}: ${text}` }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
