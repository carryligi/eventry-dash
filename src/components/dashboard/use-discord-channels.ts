'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DiscordChannelsResponse } from '@/types'

// Module-level singleton cache — survives component unmount so that multiple
// pickers and dialogs share a single fetch per page load.
let cache: DiscordChannelsResponse | null = null
let inflight: Promise<DiscordChannelsResponse> | null = null
const listeners = new Set<(data: DiscordChannelsResponse | null) => void>()

function notify() {
  for (const l of listeners) l(cache)
}

async function fetchOnce(force: boolean): Promise<DiscordChannelsResponse> {
  if (!force && cache) return cache
  if (inflight) return inflight
  inflight = (async () => {
    const res = await fetch('/api/discord/channels', { cache: force ? 'no-store' : 'default' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Failed to load channels (${res.status})`)
    }
    const json = (await res.json()) as DiscordChannelsResponse
    cache = json
    notify()
    return json
  })()
  try {
    return await inflight
  } finally {
    inflight = null
  }
}

export function useDiscordChannels() {
  const [data, setData] = useState<DiscordChannelsResponse | null>(cache)
  const [loading, setLoading] = useState<boolean>(!cache)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const json = await fetchOnce(force)
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load channels')
    } finally {
      setLoading(false)
    }
  }, [])

  const reload = useCallback(() => load(true), [load])

  useEffect(() => {
    const listener = (next: DiscordChannelsResponse | null) => setData(next)
    listeners.add(listener)
    if (!cache && !inflight) load()
    return () => {
      listeners.delete(listener)
    }
  }, [load])

  return { data, loading, error, reload }
}
