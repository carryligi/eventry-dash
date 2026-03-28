'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function togglePinger(isActive: boolean) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  await supabase.from('pinger_settings').upsert({
    user_id: profile.id,
    is_active: isActive,
  }, { onConflict: 'user_id' })
  revalidatePath('/dashboard')
}

export async function updateCooldown(minutes: number) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  await supabase.from('pinger_settings').upsert({
    user_id: profile.id,
    cooldown_minutes: minutes,
  }, { onConflict: 'user_id' })
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
}
