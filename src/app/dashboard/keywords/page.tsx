import { getUserId } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/dashboard/top-bar'
import { KeywordTable } from '@/components/dashboard/keyword-table'
import { AddKeywordDialog } from '@/components/dashboard/add-keyword-dialog'

export default async function KeywordsPage() {
  const userId = await getUserId()
  const supabase = await createServerClient()

  const [{ data: keywords }, { data: disabledKws }] = await Promise.all([
    supabase
      .from('keywords')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('autostart_disabled_keywords')
      .select('keyword')
      .eq('user_id', userId),
  ])

  const disabledKeywordsList = (disabledKws ?? []).map(
    (d: { keyword: string }) => d.keyword
  )

  return (
    <>
      <TopBar title="Keywords" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-ev-text-secondary text-sm">
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
