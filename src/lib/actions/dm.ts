'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { handleActionError } from '@/lib/action-utils'
import type { ActionResult } from '@/types'

export async function toggleKeywordDm(
  keywordId: string,
  enabled: boolean,
): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()
    const supabase = await createServerClient()

    if (enabled) {
      const { error } = await supabase
        .from('dm_disabled_keywords')
        .delete()
        .eq('user_id', profile.id)
        .eq('keyword_id', keywordId)
      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await supabase
        .from('dm_disabled_keywords')
        .upsert(
          { user_id: profile.id, keyword_id: keywordId },
          { onConflict: 'user_id,keyword_id' },
        )
      if (error) return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/keywords')
    revalidatePath('/dashboard/notifications')
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to toggle keyword DM') }
  }
}
