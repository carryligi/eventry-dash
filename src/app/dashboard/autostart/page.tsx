import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/dashboard/top-bar'
import { SilentlyConfig } from '@/components/dashboard/silently-config'
import { AutostartFilters } from '@/components/dashboard/autostart-filters'
import { ScheduleConfig } from '@/components/dashboard/schedule-config'
import { KeywordAutostartList } from '@/components/dashboard/keyword-autostart-list'

export default async function AutostartPage() {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()

  const [{ data: silentlySettings }, { data: keywords }, { data: disabledKws }] = await Promise.all([
    supabase.from('silently_settings').select('*').eq('user_id', profile.id).single(),
    supabase.from('keywords').select('*').eq('user_id', profile.id).order('keyword'),
    supabase.from('autostart_disabled_keywords').select('keyword').eq('user_id', profile.id),
  ])

  const disabledKeywordsList = (disabledKws ?? []).map((d: { keyword: string }) => d.keyword)

  return (
    <>
      <TopBar title="Autostart" silentlyActive={silentlySettings?.is_active} />
      <div className="p-6 space-y-6">
        <SilentlyConfig settings={silentlySettings} />
        <AutostartFilters minStock={silentlySettings?.min_stock ?? 0} />
        <ScheduleConfig
          scheduleStart={silentlySettings?.schedule_start ?? null}
          scheduleEnd={silentlySettings?.schedule_end ?? null}
        />
        <KeywordAutostartList
          keywords={keywords ?? []}
          disabledKeywords={disabledKeywordsList}
        />
      </div>
    </>
  )
}
