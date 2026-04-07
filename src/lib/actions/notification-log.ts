'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import type { ActionResult, NotificationLog } from '@/types'

interface LogsData {
  logs: NotificationLog[]
  totalCount: number
}

export async function fetchNotificationLogs(
  page: number,
  keyword?: string,
): Promise<ActionResult<LogsData>> {
  try {
    const profile = await getCurrentUser()
    const supabase = await createServerClient()

    const pageSize = 20
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('notification_log')
      .select('*', { count: 'exact' })
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (keyword) {
      query = query.eq('keyword_text', keyword)
    }

    const { data, count, error } = await query
    if (error) return { success: false, error: error.message }

    return {
      success: true,
      data: {
        logs: (data ?? []) as NotificationLog[],
        totalCount: count ?? 0,
      },
    }
  } catch {
    return { success: false, error: 'Fehler beim Laden der Logs' }
  }
}
