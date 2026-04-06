'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

async function ensurePingerRow(supabase: Awaited<ReturnType<typeof createServerClient>>, userId: string) {
  const { data } = await supabase
    .from('pinger_settings')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) {
    const { error } = await supabase.from('pinger_settings').insert({
      user_id: userId,
      is_active: false,
      cooldown_minutes: 0,
    })
    if (error) throw new Error(error.message)
  }
}

export async function togglePinger(isActive: boolean) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  await ensurePingerRow(supabase, profile.id)
  const { error } = await supabase
    .from('pinger_settings')
    .update({ is_active: isActive })
    .eq('user_id', profile.id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function updateCooldown(minutes: number) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  await ensurePingerRow(supabase, profile.id)
  const { error } = await supabase
    .from('pinger_settings')
    .update({ cooldown_minutes: minutes })
    .eq('user_id', profile.id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
}
