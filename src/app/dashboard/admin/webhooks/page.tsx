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
          JSON-Templates fuer die beiden Discord-Webhooks. Der Python-Bot und der Dashboard Test-Button
          rendern diese Vorlagen mit Echt- bzw. Sample-Daten, bevor sie an Discord gesendet werden.
          Aenderungen werden ueber Supabase Realtime sofort im Bot aktiv.
        </p>
      </div>

      <WebhookPayloadEditor
        title="User Autostart Webhook"
        description="Wird an den persoenlichen Webhook jedes Users gesendet, sobald ein Autostart ausgeloest wurde."
        settingKey="webhook_user_payload_template"
        defaultTemplate={DEFAULT_USER_WEBHOOK_TEMPLATE}
        currentValue={userValue}
        variables={USER_TEMPLATE_VARIABLES}
        urlSettingKey="webhook_user_test_url"
        urlLabel="Test-URL fuer User Template (nur fuer den Send-Test-Button)"
        currentUrl={userTestUrl}
      />

      <WebhookPayloadEditor
        title="Admin Log Webhook"
        description="Globaler Audit-Log Kanal. Bekommt EINEN aggregierten Webhook pro Autostart-Event mit allen ausgeloesten Usern."
        settingKey="webhook_admin_payload_template"
        defaultTemplate={DEFAULT_ADMIN_WEBHOOK_TEMPLATE}
        currentValue={adminValue}
        variables={ADMIN_TEMPLATE_VARIABLES}
        urlSettingKey="autostart_log_webhook_url"
        urlLabel="Admin Log Webhook URL (wird vom Bot genutzt)"
        currentUrl={adminLogUrl}
      />
    </div>
  )
}
