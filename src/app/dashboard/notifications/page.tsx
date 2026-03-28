import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/dashboard/top-bar'
import { PushoverConfig } from '@/components/dashboard/pushover-config'
import { NotificationLogView } from '@/components/dashboard/notification-log'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function NotificationsPage() {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()

  const [{ data: pushoverSettings }, { data: logs, count }, { data: keywords }] = await Promise.all([
    supabase.from('pushover_settings').select('*').eq('user_id', profile.id).single(),
    supabase
      .from('notification_log')
      .select('*', { count: 'exact' })
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('keywords').select('keyword').eq('user_id', profile.id),
  ])

  const uniqueKeywords = [...new Set((keywords ?? []).map((k: { keyword: string }) => k.keyword))]

  return (
    <>
      <TopBar title="Notifications" />
      <div className="p-6">
        <Tabs defaultValue={0}>
          <TabsList
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <TabsTrigger
              value={0}
              style={{ fontSize: '0.8125rem' }}
            >
              Pushover Settings
            </TabsTrigger>
            <TabsTrigger
              value={1}
              style={{ fontSize: '0.8125rem' }}
            >
              Notification Log
            </TabsTrigger>
          </TabsList>
          <TabsContent value={0} className="mt-4">
            <PushoverConfig settings={pushoverSettings} />
          </TabsContent>
          <TabsContent value={1} className="mt-4">
            <NotificationLogView
              initialLogs={logs ?? []}
              totalCount={count ?? 0}
              keywords={uniqueKeywords}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
