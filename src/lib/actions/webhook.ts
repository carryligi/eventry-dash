'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { webhookUrlSchema } from '@/lib/validations'
import { handleActionError } from '@/lib/action-utils'
import {
  DEFAULT_USER_WEBHOOK_TEMPLATE,
  SAMPLE_USER_INPUT,
  buildUserWebhookVars,
  renderWebhookTemplate,
} from '@/lib/webhook-templates'
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
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to save webhook URL') }
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
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to remove webhook URL') }
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
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to change webhook status') }
  }
}

export async function testWebhook(): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()
    const supabase = await createServerClient()

    const [{ data: settings }, { data: templateRow }] = await Promise.all([
      supabase
        .from('webhook_settings')
        .select('webhook_url')
        .eq('user_id', profile.id)
        .maybeSingle(),
      supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'webhook_user_payload_template')
        .maybeSingle(),
    ])

    if (!settings?.webhook_url) {
      return { success: false, error: 'No webhook URL configured' }
    }

    const template = templateRow?.value && templateRow.value.trim() !== ''
      ? templateRow.value
      : DEFAULT_USER_WEBHOOK_TEMPLATE

    const vars = buildUserWebhookVars(SAMPLE_USER_INPUT)
    const payload =
      renderWebhookTemplate(template, vars) ??
      renderWebhookTemplate(DEFAULT_USER_WEBHOOK_TEMPLATE, vars)

    if (!payload) {
      return { success: false, error: 'Template could not be rendered' }
    }

    const res = await fetch(settings.webhook_url, {
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
    return { success: false, error: handleActionError(err, 'Network error while testing webhook') }
  }
}
