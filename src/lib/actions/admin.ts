'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { appSettingSchema } from '@/lib/validations'
import type { ActionResult } from '@/types'

function revalidateAdmin() {
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/admin/admins')
  revalidatePath('/dashboard/admin/users')
}

export async function grantAdmin(userId: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createServerClient()

    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    if (!user) return { success: false, error: 'User hat sich noch nicht eingeloggt' }

    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', userId)
    if (error) return { success: false, error: error.message }

    revalidateAdmin()
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Fehler beim Erteilen der Admin-Rechte' }
  }
}

export async function revokeAdmin(userId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()
    if (admin.id === userId) {
      return { success: false, error: 'Du kannst dir nicht selbst die Admin-Rechte entziehen' }
    }

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: false })
      .eq('id', userId)
    if (error) return { success: false, error: error.message }

    revalidateAdmin()
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Fehler beim Entziehen der Admin-Rechte' }
  }
}

export async function updateAppSetting(key: string, value: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()

    const parsed = appSettingSchema.safeParse({ key, value })
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: parsed.data.key, value: parsed.data.value, updated_by: admin.id },
        { onConflict: 'key' },
      )
    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/admin/settings')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Fehler beim Speichern der Einstellung' }
  }
}
