'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function toggleAutostart(isActive: boolean) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('silently_settings')
    .update({ is_active: isActive })
    .eq('user_id', profile.id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/autostart')
}

export async function updateMinStock(minStock: number) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('silently_settings')
    .update({ min_stock: minStock })
    .eq('user_id', profile.id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/autostart')
}

export async function updateSchedule(start: string | null, end: string | null) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('silently_settings')
    .update({
      schedule_start: start,
      schedule_end: end,
    })
    .eq('user_id', profile.id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/autostart')
}

export async function setSilentlyKey(key: string) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()

  // Check if row exists — if yes, only update the key (preserve other settings)
  const { data: existing } = await supabase
    .from('silently_settings')
    .select('user_id')
    .eq('user_id', profile.id)
    .maybeSingle()

  if (existing) {
    // Row exists: only update the key, DON'T reset is_active or min_stock
    const { error } = await supabase
      .from('silently_settings')
      .update({ user_key: key })
      .eq('user_id', profile.id)
    if (error) throw new Error(error.message)
  } else {
    // First time: insert full row with defaults
    const { error } = await supabase.from('silently_settings').insert({
      user_id: profile.id,
      user_key: key,
      is_active: false,
      min_stock: 0,
    })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/autostart')
}

export async function removeSilentlyKey() {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('silently_settings')
    .delete()
    .eq('user_id', profile.id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/autostart')
}

export async function toggleKeywordAutostart(keyword: string, enabled: boolean) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  if (enabled) {
    const { error } = await supabase
      .from('autostart_disabled_keywords')
      .delete()
      .eq('user_id', profile.id)
      .eq('keyword', keyword)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('autostart_disabled_keywords')
      .upsert({ user_id: profile.id, keyword }, { onConflict: 'user_id,keyword' })
    if (error) throw new Error(error.message)
  }
  revalidatePath('/dashboard/autostart')
}
