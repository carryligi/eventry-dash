'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function setPushoverKey(key: string, priority: number = 0) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  const { error } = await supabase.from('pushover_settings').upsert({
    user_id: profile.id,
    user_key: key,
    priority,
  }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard')
}

export async function removePushoverKey() {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  const { error } = await supabase.from('pushover_settings').delete().eq('user_id', profile.id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard')
}

export async function updatePriority(priority: number) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  const { error } = await supabase.from('pushover_settings').update({ priority }).eq('user_id', profile.id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard')
}
