'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Hash, Volume2, Megaphone, ChevronDown, X, Search, Loader2, AlertCircle } from 'lucide-react'
import type { DiscordChannelsResponse, DiscordTextChannel } from '@/types'

// Only channels/categories belonging to these Discord category IDs are selectable
// when creating a keyword. Keyword monitoring is restricted to these categories.
const ALLOWED_CATEGORY_IDS: ReadonlySet<string> = new Set([
  '1354884871570456598',
  '1341277243573538919',
  '1341277125092704266',
  '1467591500631245051',
  '1467581388957159568',
  '1341277169191489628',
  '1344768296372797614',
])

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
    if (open && !data && !loading && !error) {
      fetchChannels()
    }
  }, [open, data, loading, error, fetchChannels])

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

  // Restrict to whitelisted categories only (drops 'uncategorized' entirely).
  const allowedCategories = data?.categories.filter((cat) =>
    ALLOWED_CATEGORY_IDS.has(cat.id),
  ) ?? []

  // Get all channels flat for lookup (only channels under allowed categories).
  const allChannels: DiscordTextChannel[] = allowedCategories.flatMap((c) => c.channels)

  const selectedNames = selectedIds
    .map((id) => allChannels.find((ch) => ch.id === id))
    .filter(Boolean) as DiscordTextChannel[]

  // Search filtering (shared)
  const searchLower = search.toLowerCase()

  const filteredCategories = allowedCategories
    .map((cat) => {
      const categoryMatches = searchLower && cat.name.toLowerCase().includes(searchLower)
      return {
        ...cat,
        channels: categoryMatches
          ? cat.channels // show all channels if category name matches
          : cat.channels.filter((ch) =>
              ch.name.toLowerCase().includes(searchLower),
            ),
      }
    })
    .filter((cat) => cat.channels.length > 0)

  // For category mode: filter categories themselves (already restricted to allowed list)
  const filteredCategoryList = allowedCategories.filter((cat) =>
    cat.name.toLowerCase().includes(searchLower),
  )

  const selectedCategory = allowedCategories.find((cat) => cat.id === selectedIds[0])

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

  // Category mode -- custom searchable single-select
  if (mode === 'category') {
    return (
      <div className="space-y-2" ref={dropdownRef}>
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex w-full items-center justify-between gap-1.5 rounded-lg border border-ev-border-default bg-white/[0.03] py-2 px-2.5 text-sm transition-colors outline-none ${
            selectedCategory ? 'text-ev-text-primary' : 'text-ev-text-tertiary'
          }`}
        >
          <span className="truncate">
            {selectedCategory ? selectedCategory.name : 'Select category...'}
          </span>
          <ChevronDown
            className={`size-4 flex-shrink-0 text-ev-text-tertiary transition-transform duration-200 ${
              open ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="rounded-lg border border-ev-border-default bg-ev-secondary shadow-lg overflow-hidden">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-ev-border-subtle">
              <Search className="size-3.5 flex-shrink-0 text-ev-text-tertiary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories..."
                className="flex-1 bg-transparent text-sm text-ev-text-primary outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>

            <div className="max-h-56 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-6">
                  <Loader2 className="size-4 animate-spin text-ev-text-tertiary" />
                  <span className="text-xs text-ev-text-tertiary">Loading categories...</span>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center gap-2 py-6 px-4">
                  <AlertCircle className="size-4 text-ev-error" />
                  <span className="text-xs text-center text-ev-error">{error}</span>
                  <button
                    type="button"
                    onClick={() => { cacheRef.current = null; fetchChannels() }}
                    className="text-xs underline text-ev-text-accent"
                  >
                    Retry
                  </button>
                </div>
              )}

              {data && filteredCategoryList.length === 0 && (
                <div className="py-6 text-center">
                  <span className="text-xs text-ev-text-tertiary">
                    {search ? 'No categories match your search' : 'No categories found'}
                  </span>
                </div>
              )}

              {filteredCategoryList.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onSelectionChange([cat.id])
                    setOpen(false)
                    setSearch('')
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-white/[0.03] ${
                    selectedIds[0] === cat.id
                      ? 'text-ev-text-primary bg-white/[0.04]'
                      : 'text-ev-text-secondary'
                  }`}
                >
                  <div
                    className={`flex items-center justify-center size-4 rounded-full border flex-shrink-0 transition-colors ${
                      selectedIds[0] === cat.id
                        ? 'border-ev-text-accent bg-ev-text-accent'
                        : 'border-ev-border-default bg-transparent'
                    }`}
                  >
                    {selectedIds[0] === cat.id && (
                      <div className="size-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="truncate">{cat.name}</span>
                  <span className="ml-auto text-xs text-ev-text-tertiary">
                    {cat.channels.length} ch.
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual fallback when API fails */}
        {error && !open && (
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

  // Channels mode -- custom multi-select
  return (
    <div className="space-y-2" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between gap-1.5 rounded-lg border border-ev-border-default bg-white/[0.03] py-2 px-2.5 text-sm transition-colors outline-none ${
          selectedIds.length > 0 ? 'text-ev-text-primary' : 'text-ev-text-tertiary'
        }`}
      >
        <span className="truncate">
          {selectedIds.length === 0
            ? 'Select channels...'
            : `${selectedIds.length} channel${selectedIds.length !== 1 ? 's' : ''} selected`}
        </span>
        <ChevronDown
          className={`size-4 flex-shrink-0 text-ev-text-tertiary transition-transform duration-200 ${
            open ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      {/* Selected chips */}
      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedNames.map((ch) => (
            <span
              key={ch.id}
              className="inline-flex items-center gap-1 rounded-md bg-ev-tertiary px-2 py-0.5 text-xs font-medium text-ev-text-secondary"
            >
              <ChannelIcon type={ch.type} className="size-3" />
              {ch.name}
              <button
                type="button"
                onClick={() => removeChannel(ch.id)}
                className="ml-0.5 rounded-sm text-ev-text-tertiary transition-colors"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="rounded-lg border border-ev-border-default bg-ev-secondary shadow-lg overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-ev-border-subtle">
            <Search className="size-3.5 flex-shrink-0 text-ev-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels or categories..."
              className="flex-1 bg-transparent text-sm text-ev-text-primary outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          {/* Channel list */}
          <div className="max-h-56 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6">
                <Loader2 className="size-4 animate-spin text-ev-text-tertiary" />
                <span className="text-xs text-ev-text-tertiary">Loading channels...</span>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-2 py-6 px-4">
                <AlertCircle className="size-4 text-ev-error" />
                <span className="text-xs text-center text-ev-error">{error}</span>
                <button
                  type="button"
                  onClick={() => { cacheRef.current = null; fetchChannels() }}
                  className="text-xs underline text-ev-text-accent"
                >
                  Retry
                </button>
              </div>
            )}

            {data && filteredCategories.length === 0 && (
              <div className="py-6 text-center">
                <span className="text-xs text-ev-text-tertiary">
                  {search ? 'No channels match your search' : 'No channels found'}
                </span>
              </div>
            )}

            {/* Categorized channels */}
            {filteredCategories.map((cat) => (
              <div key={cat.id}>
                <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-ev-text-tertiary">
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
              e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
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
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-white/[0.03] ${
        selected ? 'text-ev-text-primary bg-white/[0.04]' : 'text-ev-text-secondary'
      }`}
    >
      {/* Checkbox */}
      <div
        className={`flex items-center justify-center size-4 rounded border flex-shrink-0 transition-colors ${
          selected
            ? 'border-ev-text-accent bg-ev-text-accent'
            : 'border-ev-border-default bg-transparent'
        }`}
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
