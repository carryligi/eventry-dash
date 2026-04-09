'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { cooldownSchema } from '@/lib/validations'
import { handleActionError } from '@/lib/action-utils'
import type { ActionResult } from '@/types'

export async function togglePinger(isActive: boolean): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()
    const supabase = await createServerClient()

    const { error } = await supabase
      .from('pinger_settings')
      .upsert(
        { user_id: profile.id, is_active: isActive },
        { onConflict: 'user_id', ignoreDuplicates: false },
      )
    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to change Pinger status') }
  }
}

export async function updateCooldown(minutes: number): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()

    const parsed = cooldownSchema.safeParse({ cooldown_minutes: minutes })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('pinger_settings')
      .upsert(
        { user_id: profile.id, cooldown_minutes: parsed.data.cooldown_minutes },
        { onConflict: 'user_id', ignoreDuplicates: false },
      )
    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to change cooldown') }
  }
}
