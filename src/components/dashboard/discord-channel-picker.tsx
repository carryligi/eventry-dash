'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Hash, Volume2, Megaphone, ChevronDown, X, Search, Loader2, AlertCircle } from 'lucide-react'
import type { DiscordChannelsResponse, DiscordTextChannel } from '@/types'

interface DiscordChannelPickerProps {
  mode: 'channels' | 'category'
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

function ChannelIcon({ type, className }: { type: number; className?: string }) {
  switch (type) {
    case 2:
      return <Volume2 className={className} />
    case 5:
      return <Megaphone className={className} />
    default:
      return <Hash className={className} />
  }
}

export function DiscordChannelPicker({ mode, selectedIds, onSelectionChange }: DiscordChannelPickerProps) {
  const [data, setData] = useState<DiscordChannelsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const cacheRef = useRef<DiscordChannelsResponse | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchChannels = useCallback(async () => {
    if (cacheRef.current) {
      setData(cacheRef.current)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/discord/channels')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed to load channels (${res.status})`)
      }
      const json: DiscordChannelsResponse = await res.json()
      cacheRef.current = json
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load channels')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch when dropdown opens
  useEffect(() => {
    if (open && !data && !loading) {
      fetchChannels()
    }
  }, [open, data, loading, fetchChannels])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Get all channels flat for lookup
  const allChannels: DiscordTextChannel[] = data
    ? [...data.uncategorized, ...data.categories.flatMap((c) => c.channels)]
    : []

  const selectedNames = selectedIds
    .map((id) => allChannels.find((ch) => ch.id === id))
    .filter(Boolean) as DiscordTextChannel[]

  // Category mode — use existing Select components
  if (mode === 'category') {
    return (
      <div className="space-y-2">
        <Select
          value={selectedIds[0] ?? ''}
          onValueChange={(v) => onSelectionChange(v ? [v] : [])}
          onOpenChange={(isOpen) => {
            if (isOpen) fetchChannels()
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={loading ? 'Loading...' : 'Select category'} />
          </SelectTrigger>
          <SelectContent>
            {error && (
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--error)' }}>
                {error}
              </div>
            )}
            {data && data.categories.length === 0 && (
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                No categories found
              </div>
            )}
            {data && (
              <SelectGroup>
                <SelectLabel>Categories</SelectLabel>
                {data.categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
        {/* Manual fallback */}
        {error && (
          <Input
            placeholder="Or enter category ID manually"
            value={selectedIds[0] ?? ''}
            onChange={(e) => onSelectionChange(e.target.value ? [e.target.value] : [])}
            className="text-sm"
          />
        )}
      </div>
    )
  }

  // Channels mode — custom multi-select
  const filteredCategories = data?.categories
    .map((cat) => ({
      ...cat,
      channels: cat.channels.filter((ch) =>
        ch.name.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.channels.length > 0) ?? []

  const filteredUncategorized = data?.uncategorized.filter((ch) =>
    ch.name.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  const toggleChannel = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((s) => s !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const removeChannel = (id: string) => {
    onSelectionChange(selectedIds.filter((s) => s !== id))
  }

  return (
    <div className="space-y-2" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-1.5 rounded-lg border py-2 px-2.5 text-sm transition-colors outline-none"
        style={{
          borderColor: 'var(--border-default)',
          backgroundColor: 'rgba(255,255,255,0.03)',
          color: selectedIds.length > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)',
        }}
      >
        <span className="truncate">
          {selectedIds.length === 0
            ? 'Select channels...'
            : `${selectedIds.length} channel${selectedIds.length !== 1 ? 's' : ''} selected`}
        </span>
        <ChevronDown
          className="size-4 flex-shrink-0 transition-transform duration-200"
          style={{
            color: 'var(--text-tertiary)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Selected chips */}
      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedNames.map((ch) => (
            <span
              key={ch.id}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
              }}
            >
              <ChannelIcon type={ch.type} className="size-3" />
              {ch.name}
              <button
                type="button"
                onClick={() => removeChannel(ch.id)}
                className="ml-0.5 rounded-sm transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="rounded-lg border shadow-lg overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-default)',
          }}
        >
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <Search className="size-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              style={{ color: 'var(--text-primary)' }}
              autoFocus
            />
          </div>

          {/* Channel list */}
          <div className="max-h-56 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6">
                <Loader2 className="size-4 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Loading channels...</span>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-2 py-6 px-4">
                <AlertCircle className="size-4" style={{ color: 'var(--error)' }} />
                <span className="text-xs text-center" style={{ color: 'var(--error)' }}>{error}</span>
                <button
                  type="button"
                  onClick={() => { cacheRef.current = null; fetchChannels() }}
                  className="text-xs underline"
                  style={{ color: 'var(--text-accent)' }}
                >
                  Retry
                </button>
              </div>
            )}

            {data && filteredCategories.length === 0 && filteredUncategorized.length === 0 && (
              <div className="py-6 text-center">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {search ? 'No channels match your search' : 'No channels found'}
                </span>
              </div>
            )}

            {/* Uncategorized channels */}
            {filteredUncategorized.map((ch) => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                selected={selectedIds.includes(ch.id)}
                onToggle={() => toggleChannel(ch.id)}
              />
            ))}

            {/* Categorized channels */}
            {filteredCategories.map((cat) => (
              <div key={cat.id}>
                <div
                  className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {cat.name}
                </div>
                {cat.channels.map((ch) => (
                  <ChannelRow
                    key={ch.id}
                    channel={ch}
                    selected={selectedIds.includes(ch.id)}
                    onToggle={() => toggleChannel(ch.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual fallback when API fails */}
      {error && !open && (
        <Input
          placeholder="Or enter channel IDs manually (comma-separated)"
          value={selectedIds.join(', ')}
          onChange={(e) =>
            onSelectionChange(
              e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            )
          }
          className="text-sm"
        />
      )}
    </div>
  )
}

function ChannelRow({
  channel,
  selected,
  onToggle,
}: {
  channel: DiscordTextChannel
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors duration-150"
      style={{
        color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
        backgroundColor: selected ? 'rgba(255,255,255,0.04)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {/* Checkbox */}
      <div
        className="flex items-center justify-center size-4 rounded border flex-shrink-0 transition-colors"
        style={{
          borderColor: selected ? 'var(--text-accent)' : 'var(--border-default)',
          backgroundColor: selected ? 'var(--text-accent)' : 'transparent',
        }}
      >
        {selected && (
          <svg className="size-3" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2">
            <path d="M2.5 6l2.5 2.5 4.5-5" />
          </svg>
        )}
      </div>

      {/* Channel icon + name */}
      <ChannelIcon type={channel.type} className="size-3.5 flex-shrink-0 text-muted-foreground" />
      <span className="truncate">{channel.name}</span>
    </button>
  )
}
