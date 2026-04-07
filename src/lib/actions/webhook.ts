'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { webhookUrlSchema } from '@/lib/validations'
import type { ActionResult } from '@/types'

function revalidateNotifications() {
  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard')
}

export async function setWebhookUrl(url: string): Promise<ActionResult> {
  try {
    const parsed = webhookUrlSchema.safeParse({ webhook_url: url })
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const profile = await getCurrentUser()
    const supabase = await createServerClient()

    const { error } = await supabase
      .from('webhook_settings')
      .upsert(
        { user_id: profile.id, webhook_url: parsed.data.webhook_url, is_active: true },
        { onConflict: 'user_id' },
      )
    if (error) return { success: false, error: error.message }

    revalidateNotifications()
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Fehler beim Speichern der Webhook URL' }
  }
}

export async function removeWebhookUrl(): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()
    const supabase = await createServerClient()
    const { error } = await supabase
      .from('webhook_settings')
      .delete()
      .eq('user_id', profile.id)
    if (error) return { success: false, error: error.message }

    revalidateNotifications()
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Fehler beim Entfernen der Webhook URL' }
  }
}

export async function toggleWebhook(isActive: boolean): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()
    const supabase = await createServerClient()
    const { error } = await supabase
      .from('webhook_settings')
      .update({ is_active: isActive })
      .eq('user_id', profile.id)
    if (error) return { success: false, error: error.message }

    revalidateNotifications()
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Fehler beim Aendern des Webhook-Status' }
  }
}

export async function testWebhook(): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()
    const supabase = await createServerClient()
    const { data: settings } = await supabase
      .from('webhook_settings')
      .select('webhook_url')
      .eq('user_id', profile.id)
      .maybeSingle()

    if (!settings?.webhook_url) {
      return { success: false, error: 'Keine Webhook URL konfiguriert' }
    }

    const now = new Date()
    const timestamp = now.toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Europe/Berlin',
    })

    const res = await fetch(settings.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Eventry',
        embeds: [{
          title: 'Autostart Triggered',
          description: 'This is a **test notification** from your Eventry Autostart webhook.',
          color: 11382189,
          fields: [
            { name: 'Keyword', value: 'test-keyword', inline: true },
            { name: 'Status', value: '200 OK', inline: true },
            { name: 'Product', value: 'Test Product - Webhook Verification', inline: false },
            { name: 'Price Breaks', value: '85.00: 9, 95.00: 6', inline: true },
            { name: 'Stock', value: '15', inline: true },
            { name: 'Product Link', value: 'https://example.com/product/test', inline: false },
            { name: 'Message', value: '[Jump to original message](https://discord.com)', inline: false },
          ],
          footer: { text: `Eventry Autostart \u2022 ${timestamp} CEST` },
          timestamp: now.toISOString(),
        }],
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `Discord returned ${res.status}: ${text}` }
    }

    return { success: true, data: undefined }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Netzwerkfehler beim Testen des Webhooks',
    }
  }
}
