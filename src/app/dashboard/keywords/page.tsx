import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/dashboard/top-bar'
import { KeywordTable } from '@/components/dashboard/keyword-table'
import { AddKeywordDialog } from '@/components/dashboard/add-keyword-dialog'

export default async function KeywordsPage() {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()

  const [{ data: keywords }, { data: disabledKws }] = await Promise.all([
    supabase
      .from('keywords')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('autostart_disabled_keywords')
      .select('keyword')
      .eq('user_id', profile.id),
  ])

  const disabledKeywordsList = (disabledKws ?? []).map(
    (d: { keyword: string }) => d.keyword
  )

  return (
    <>
      <TopBar title="Keywords" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p style={{ color: 'var(--text-secondary)' }}>
            {keywords?.length ?? 0} keyword
            {(keywords?.length ?? 0) !== 1 ? 's' : ''} configured
          </p>
          <AddKeywordDialog />
        </div>
        <KeywordTable
          keywords={keywords ?? []}
          disabledKeywords={disabledKeywordsList}
        />
      </div>
    </>
  )
}
