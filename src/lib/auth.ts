import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'

// Cached per-request: auth.getUser() runs at most once per server request
const getAuthUser = cache(async () => {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

// Cached per-request: profile query runs at most once per server request
const getProfileById = cache(async (userId: string) => {
  const supabase = await createServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return profile as Profile | null
})

export async function getUserId(): Promise<string> {
  const user = await getAuthUser()
  if (!user) redirect('/')
  return user.user_metadata.provider_id
}

export async function getCurrentUser(): Promise<Profile> {
  const user = await getAuthUser()
  if (!user) redirect('/')

  const profile = await getProfileById(user.user_metadata.provider_id)
  if (!profile) redirect('/')
  return profile
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentUser()
  if (!profile.is_admin) redirect('/dashboard')
  return profile
}

export async function getOptionalUser(): Promise<Profile | null> {
  const user = await getAuthUser()
  if (!user) return null

  return getProfileById(user.user_metadata.provider_id)
}
