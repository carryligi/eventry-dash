import { createServerClient } from '@/lib/supabase/server'
import { WebhookPayloadEditor } from '@/components/admin/webhook-payload-editor'
import {
  DEFAULT_USER_WEBHOOK_TEMPLATE,
  DEFAULT_ADMIN_WEBHOOK_TEMPLATE,
  USER_TEMPLATE_VARIABLES,
  ADMIN_TEMPLATE_VARIABLES,
} from '@/lib/webhook-templates'
import type { AppSetting } from '@/types'

const KEYS = [
  'webhook_user_payload_template',
  'webhook_admin_payload_template',
  'webhook_user_test_url',
  'autostart_log_webhook_url',
] as const

export default async function AdminWebhooksPage() {
  const supabase = await createServerClient()

  const { data: rows } = await supabase
    .from('app_settings')
    .select('*')
    .in('key', KEYS as unknown as string[])

  const byKey = new Map<string, AppSetting>()
  for (const r of (rows ?? []) as AppSetting[]) byKey.set(r.key, r)

  const userValue = byKey.get('webhook_user_payload_template')?.value ?? null
  const adminValue = byKey.get('webhook_admin_payload_template')?.value ?? null
  const userTestUrl = byKey.get('webhook_user_test_url')?.value ?? null
  const adminLogUrl = byKey.get('autostart_log_webhook_url')?.value ?? null

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-ev-text-primary">Webhook Templates</h2>
        <p className="text-xs text-ev-text-secondary mt-1">
          JSON templates for the two Discord webhooks. The Python bot and the dashboard Test button
          render these templates with real or sample data before sending them to Discord. Changes
          propagate to the bot instantly via Supabase Realtime.
        </p>
      </div>

      <WebhookPayloadEditor
        title="User Autostart Webhook"
        description="Sent to each user's personal webhook whenever an autostart is triggered."
        settingKey="webhook_user_payload_template"
        defaultTemplate={DEFAULT_USER_WEBHOOK_TEMPLATE}
        currentValue={userValue}
        variables={USER_TEMPLATE_VARIABLES}
        urlSettingKey="webhook_user_test_url"
        urlLabel="Test URL for user template (only for the Send Test button)"
        currentUrl={userTestUrl}
      />

      <WebhookPayloadEditor
        title="Admin Log Webhook"
        description="Global audit log channel. Receives ONE aggregated webhook per autostart event listing all triggered users."
        settingKey="webhook_admin_payload_template"
        defaultTemplate={DEFAULT_ADMIN_WEBHOOK_TEMPLATE}
        currentValue={adminValue}
        variables={ADMIN_TEMPLATE_VARIABLES}
        urlSettingKey="autostart_log_webhook_url"
        urlLabel="Admin log webhook URL (used by the bot)"
        currentUrl={adminLogUrl}
      />
    </div>
  )
}
