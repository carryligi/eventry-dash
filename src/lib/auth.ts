import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'

export async function getCurrentUser(): Promise<Profile> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.user_metadata.provider_id)
    .single()

  if (!profile) redirect('/')
  return profile as Profile
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentUser()
  if (!profile.is_admin) redirect('/dashboard')
  return profile
}

export async function getOptionalUser(): Promise<Profile | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.user_metadata.provider_id)
    .single()

  return profile as Profile | null
}
