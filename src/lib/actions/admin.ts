'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function grantAdmin(userId: string) {
  await requireAdmin()
  const supabase = await createServerClient()

  const { data: user } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()
  if (!user) throw new Error('User has not logged in yet')

  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', userId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/admin/admins')
  revalidatePath('/dashboard/admin/users')
}

export async function revokeAdmin(userId: string) {
  const admin = await requireAdmin()
  if (admin.id === userId) throw new Error('Cannot revoke your own admin status')

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: false })
    .eq('id', userId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/admin/admins')
  revalidatePath('/dashboard/admin/users')
}

export async function updateAppSetting(key: string, value: string) {
  const admin = await requireAdmin()
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('app_settings')
    .update({ value, updated_by: admin.id })
    .eq('key', key)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/admin/settings')
}
