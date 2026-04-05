'use client'

import { useEffect, useState } from 'react'
import type { Profile } from '@/types'

export function useUser() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfile(data as Profile | null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [])

  return { profile, loading }
}
