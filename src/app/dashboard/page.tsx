import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { StatCards } from '@/components/dashboard/stat-cards'
import { QuickSettings } from '@/components/dashboard/quick-settings'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { TopBar } from '@/components/dashboard/top-bar'

export default async function DashboardPage() {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()

  const [
    { data: keywords },
    { data: pingerSettings },
    { data: silentlySettings },
    { count: totalMatches },
    { count: todayMatches },
    { data: recentLogs },
  ] = await Promise.all([
    supabase.from('keywords').select('id').eq('user_id', profile.id),
    supabase.from('pinger_settings').select('*').eq('user_id', profile.id).single(),
    supabase.from('silently_settings').select('*').eq('user_id', profile.id).single(),
    supabase.from('notification_log').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
    supabase.from('notification_log').select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .gte('created_at', new Date().toISOString().split('T')[0]),
    supabase.from('notification_log').select('*').eq('user_id', profile.id)
      .order('created_at', { ascending: false }).limit(10),
  ])

  return (
    <>
      <TopBar
        title="Dashboard"
        pingerActive={pingerSettings?.is_active}
        silentlyActive={silentlySettings?.is_active}
      />
      <div className="p-6 space-y-6">
        <StatCards
          keywordCount={keywords?.length ?? 0}
          totalMatches={totalMatches ?? 0}
          pingerActive={pingerSettings?.is_active ?? false}
          todayMatches={todayMatches ?? 0}
        />
        <QuickSettings
          pingerSettings={pingerSettings}
          silentlySettings={silentlySettings}
        />
        <RecentActivity logs={recentLogs ?? []} />
      </div>
    </>
  )
}
