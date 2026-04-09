'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import {
  appSettingSchema,
  webhookTemplateSchema,
  type WebhookTemplateKey,
} from '@/lib/validations'
import { handleActionError } from '@/lib/action-utils'
import {
  DEFAULT_USER_WEBHOOK_TEMPLATE,
  DEFAULT_ADMIN_WEBHOOK_TEMPLATE,
  SAMPLE_USER_INPUT,
  SAMPLE_ADMIN_INPUT,
  buildUserWebhookVars,
  buildAdminWebhookVars,
  renderWebhookTemplate,
} from '@/lib/webhook-templates'
import type { ActionResult } from '@/types'

function revalidateAdmin() {
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/admin/admins')
  revalidatePath('/dashboard/admin/users')
}

export async function grantAdmin(userId: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createServerClient()

    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    if (!user) return { success: false, error: 'User has not logged in yet' }

    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', userId)
    if (error) return { success: false, error: error.message }

    revalidateAdmin()
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to grant admin rights') }
  }
}

export async function revokeAdmin(userId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()
    if (admin.id === userId) {
      return { success: false, error: 'You cannot revoke your own admin rights' }
    }

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: false })
      .eq('id', userId)
    if (error) return { success: false, error: error.message }

    revalidateAdmin()
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to revoke admin rights') }
  }
}

export async function updateAppSetting(key: string, value: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    const parsed = appSettingSchema.safeParse({ key, value })
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    // Key-specific validation for webhook URLs. Allow empty string to clear.
    const isWebhookUrlKey =
      parsed.data.key === 'autostart_log_webhook_url' ||
      parsed.data.key === 'webhook_user_test_url'
    if (isWebhookUrlKey && parsed.data.value.trim() !== '') {
      const url = parsed.data.value.trim()
      const isDiscordWebhook =
        url.startsWith('https://discord.com/api/webhooks/') ||
        url.startsWith('https://discordapp.com/api/webhooks/')
      if (!isDiscordWebhook) {
        return {
          success: false,
          error: 'Must be a valid Discord webhook URL (https://discord.com/api/webhooks/...)',
        }
      }
    }

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: parsed.data.key, value: parsed.data.value, updated_by: admin.id },
        { onConflict: 'key' },
      )
    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/admin/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to save setting') }
  }
}

// ─── Webhook Payload Templates ────────────────────────────────────────────────

export async function updateWebhookTemplate(
  key: WebhookTemplateKey,
  value: string,
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    const parsed = webhookTemplateSchema.safeParse({ key, value })
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: parsed.data.key, value: parsed.data.value, updated_by: admin.id },
        { onConflict: 'key' },
      )
    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/admin/webhooks')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to save webhook template') }
  }
}

/**
 * Send a test notification using the saved webhook template (or the default
 * if none is saved). Used by the "Send Test" buttons on the admin editor.
 *
 * - `webhook_user_payload_template` → posts to the admin's own user webhook URL
 * - `webhook_admin_payload_template` → posts to `autostart_log_webhook_url`
 */
export async function testWebhookTemplate(
  key: WebhookTemplateKey,
): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createServerClient()

    // Load template (from DB) with fallback to default
    const { data: templateRow } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()

    const defaultTemplate =
      key === 'webhook_user_payload_template'
        ? DEFAULT_USER_WEBHOOK_TEMPLATE
        : DEFAULT_ADMIN_WEBHOOK_TEMPLATE
    const template = templateRow?.value && templateRow.value.trim() !== ''
      ? templateRow.value
      : defaultTemplate

    // Resolve target URL — now read from app_settings per template
    const urlKey =
      key === 'webhook_user_payload_template'
        ? 'webhook_user_test_url'
        : 'autostart_log_webhook_url'
    const { data: urlRow } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', urlKey)
      .maybeSingle()
    if (!urlRow?.value) {
      return {
        success: false,
        error: `No webhook URL set (${urlKey}). Set the URL above in the editor.`,
      }
    }
    const targetUrl = urlRow.value

    // Render template with sample vars
    const vars =
      key === 'webhook_user_payload_template'
        ? buildUserWebhookVars(SAMPLE_USER_INPUT)
        : buildAdminWebhookVars(SAMPLE_ADMIN_INPUT)
    const payload = renderWebhookTemplate(template, vars)
    if (!payload) {
      return {
        success: false,
        error: 'Template could not be rendered (invalid JSON after substitution).',
      }
    }

    // POST to Discord
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `Discord returned ${res.status}: ${text.slice(0, 300)}` }
    }

    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to send test webhook') }
  }
}
