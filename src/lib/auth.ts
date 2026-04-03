import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'

// Cached per-request: auth.getUser() runs at most once per server request
const getAuthUser = cache(async () => {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

// Cached across requests: profile query cached for 5 minutes
// Uses unstable_cache for cross-request caching + React.cache for per-request dedup
const getProfileById = cache(async (userId: string) => {
  const getCachedProfile = unstable_cache(
    async (id: string) => {
      const supabase = await createServerClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      return profile as Profile | null
    },
    [`profile-${userId}`],
    { revalidate: 300, tags: [`profile-${userId}`] }
  )
  return getCachedProfile(userId)
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
