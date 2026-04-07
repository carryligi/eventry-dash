'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { pushoverKeySchema } from '@/lib/validations'
import type { ActionResult } from '@/types'

function revalidateNotifications() {
  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard')
}

export async function setPushoverKey(key: string, priority: number = 0): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()

    const parsed = pushoverKeySchema.safeParse({ user_key: key, priority })
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const supabase = await createServerClient()

    // Check if row exists to preserve priority when only updating key
    const { data: existing } = await supabase
      .from('pushover_settings')
      .select('user_id')
      .eq('user_id', profile.id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('pushover_settings')
        .update({ user_key: parsed.data.user_key })
        .eq('user_id', profile.id)
      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await supabase.from('pushover_settings').insert({
        user_id: profile.id,
        user_key: parsed.data.user_key,
        priority: parsed.data.priority,
      })
      if (error) return { success: false, error: error.message }
    }

    revalidateNotifications()
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Fehler beim Speichern des Pushover Keys' }
  }
}

export async function removePushoverKey(): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()
    const supabase = await createServerClient()
    const { error } = await supabase
      .from('pushover_settings')
      .delete()
      .eq('user_id', profile.id)
    if (error) return { success: false, error: error.message }

    revalidateNotifications()
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Fehler beim Entfernen des Pushover Keys' }
  }
}

export async function updatePriority(priority: number): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()

    if (priority < 0 || priority > 2) {
      return { success: false, error: 'Prioritaet muss zwischen 0 und 2 liegen' }
    }

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('pushover_settings')
      .update({ priority })
      .eq('user_id', profile.id)
    if (error) return { success: false, error: error.message }

    revalidateNotifications()
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Fehler beim Aendern der Prioritaet' }
  }
}
