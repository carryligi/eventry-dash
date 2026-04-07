import { getUserId } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/dashboard/top-bar'
import { PushoverConfig } from '@/components/dashboard/pushover-config'
import { WebhookConfig } from '@/components/dashboard/webhook-config'
import { NotificationLogView } from '@/components/dashboard/notification-log'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function NotificationsPage() {
  const userId = await getUserId()
  const supabase = await createServerClient()

  const [{ data: pushoverSettings }, { data: webhookSettings }, { data: logs, count }, { data: keywords }] = await Promise.all([
    supabase.from('pushover_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('webhook_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('notification_log')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('keywords').select('*').eq('user_id', userId),
  ])

  return (
    <>
      <TopBar title="Notifications" />
      <div className="p-6">
        <Tabs defaultValue="pushover">
          <TabsList className="bg-ev-tertiary border border-ev-border-subtle">
            <TabsTrigger value="pushover" className="text-[0.8125rem]">
              Pushover Settings
            </TabsTrigger>
            <TabsTrigger value="webhook" className="text-[0.8125rem]">
              Discord Webhook
            </TabsTrigger>
            <TabsTrigger value="log" className="text-[0.8125rem]">
              Notification Log
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pushover" className="mt-4">
            <PushoverConfig settings={pushoverSettings} />
          </TabsContent>
          <TabsContent value="webhook" className="mt-4">
            <WebhookConfig settings={webhookSettings} />
          </TabsContent>
          <TabsContent value="log" className="mt-4">
            <NotificationLogView
              initialLogs={logs ?? []}
              totalCount={count ?? 0}
              keywords={keywords ?? []}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
