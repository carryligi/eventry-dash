'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function setPushoverKey(key: string, priority: number = 0) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()

  // Check if row exists — if yes, only update the key (preserve priority)
  const { data: existing } = await supabase
    .from('pushover_settings')
    .select('user_id')
    .eq('user_id', profile.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('pushover_settings')
      .update({ user_key: key })
      .eq('user_id', profile.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('pushover_settings').insert({
      user_id: profile.id,
      user_key: key,
      priority,
    })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard')
}

export async function removePushoverKey() {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('pushover_settings')
    .delete()
    .eq('user_id', profile.id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard')
}

export async function updatePriority(priority: number) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('pushover_settings')
    .update({ priority })
    .eq('user_id', profile.id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard')
}
