'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { silentlyKeySchema, minStockSchema, scheduleSchema } from '@/lib/validations'
import { handleActionError } from '@/lib/action-utils'
import type { ActionResult } from '@/types'

function revalidateAutostart() {
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/autostart')
}

export async function setSilentlyKey(key: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()

    const parsed = silentlyKeySchema.safeParse({ user_key: key })
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const supabase = await createServerClient()

    const { data: existing } = await supabase
      .from('silently_settings')
      .select('user_id')
      .eq('user_id', profile.id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('silently_settings')
        .update({ user_key: parsed.data.user_key })
        .eq('user_id', profile.id)
      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await supabase.from('silently_settings').insert({
        user_id: profile.id,
        user_key: parsed.data.user_key,
        is_active: false,
        min_stock: 0,
      })
      if (error) return { success: false, error: error.message }
    }

    revalidateAutostart()
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to save Silently key') }
  }
}

export async function removeSilentlyKey(): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()
    const supabase = await createServerClient()
    const { error } = await supabase
      .from('silently_settings')
      .delete()
      .eq('user_id', profile.id)
    if (error) return { success: false, error: error.message }

    revalidateAutostart()
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to remove Silently key') }
  }
}

export async function toggleAutostart(isActive: boolean): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()
    const supabase = await createServerClient()
    const { error } = await supabase
      .from('silently_settings')
      .update({ is_active: isActive })
      .eq('user_id', profile.id)
    if (error) return { success: false, error: error.message }

    revalidateAutostart()
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to change autostart status') }
  }
}

export async function updateMinStock(minStock: number): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()

    const parsed = minStockSchema.safeParse({ min_stock: minStock })
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('silently_settings')
      .update({ min_stock: parsed.data.min_stock })
      .eq('user_id', profile.id)
    if (error) return { success: false, error: error.message }

    revalidateAutostart()
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to change min stock') }
  }
}

export async function updateSchedule(
  start: string | null,
  end: string | null,
): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()

    const parsed = scheduleSchema.safeParse({ schedule_start: start, schedule_end: end })
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('silently_settings')
      .update({
        schedule_start: parsed.data.schedule_start,
        schedule_end: parsed.data.schedule_end,
      })
      .eq('user_id', profile.id)
    if (error) return { success: false, error: error.message }

    revalidateAutostart()
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to change schedule') }
  }
}

export async function toggleKeywordAutostart(
  keyword: string,
  enabled: boolean,
): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()
    const supabase = await createServerClient()

    if (enabled) {
      const { error } = await supabase
        .from('autostart_disabled_keywords')
        .delete()
        .eq('user_id', profile.id)
        .eq('keyword', keyword)
      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await supabase
        .from('autostart_disabled_keywords')
        .upsert(
          { user_id: profile.id, keyword },
          { onConflict: 'user_id,keyword' },
        )
      if (error) return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/autostart')
    revalidatePath('/dashboard/keywords')
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to change keyword autostart') }
  }
}
