import { Suspense } from 'react'
import { getUserId } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { StatCards } from '@/components/dashboard/stat-cards'
import { QuickSettings } from '@/components/dashboard/quick-settings'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { TopBar } from '@/components/dashboard/top-bar'
import { Skeleton } from '@/components/ui/skeleton'

async function DashboardStats() {
  const userId = await getUserId()
  const supabase = await createServerClient()

  const [
    { data: keywords },
    { data: pingerSettings },
    { data: silentlySettings },
    { count: totalMatches },
    { count: todayMatches },
  ] = await Promise.all([
    supabase.from('keywords').select('id').eq('user_id', userId),
    supabase.from('pinger_settings').select('*').eq('user_id', userId).single(),
    supabase.from('silently_settings').select('*').eq('user_id', userId).single(),
    supabase.from('notification_log').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('notification_log').select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date().toISOString().split('T')[0]),
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
      </div>
    </>
  )
}

async function DashboardRecentActivity() {
  const userId = await getUserId()
  const supabase = await createServerClient()

  const { data: recentLogs } = await supabase
    .from('notification_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="px-6 pb-6">
      <RecentActivity logs={recentLogs ?? []} />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <>
      <Suspense fallback={
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      }>
        <DashboardStats />
      </Suspense>
      <Suspense fallback={
        <div className="px-6 pb-6">
          <Skeleton className="h-64 rounded-lg" />
        </div>
      }>
        <DashboardRecentActivity />
      </Suspense>
    </>
  )
}
