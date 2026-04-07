import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'

// Cached per-request: session read runs at most once per server request
const getSessionData = cache(async () => {
  return getSession()
})

// Cached per-request: profile query runs at most once per server request
const getProfileById = cache(async (userId: string) => {
  const supabase = await createServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return profile as Profile | null
})

export async function getUserId(): Promise<string> {
  const session = await getSessionData()
  if (!session) redirect('/')
  return session.userId
}

export async function getCurrentUser(): Promise<Profile> {
  const session = await getSessionData()
  if (!session) redirect('/')

  const profile = await getProfileById(session.userId)
  if (!profile) redirect('/')
  return profile
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentUser()
  if (!profile.is_admin) redirect('/dashboard')
  return profile
}

export async function getOptionalUser(): Promise<Profile | null> {
  const session = await getSessionData()
  if (!session) return null

  return getProfileById(session.userId)
}
