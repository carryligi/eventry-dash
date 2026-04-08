'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import {
  Hash,
  Volume2,
  Megaphone,
  FolderOpen,
  ChevronDown,
  X,
  Search,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import type { DiscordCategory, DiscordTextChannel } from '@/types'
import { useDiscordChannels } from './use-discord-channels'

// The category whitelist lives server-side in app_settings.allowed_category_ids
// (see /api/discord/channels/route.ts). This component just renders what the
// API returns — no client-side filtering. An admin can edit the whitelist at
// /dashboard/admin/settings without a redeploy.

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

export function DiscordChannelPicker({
  mode,
  selectedIds,
  onSelectionChange,
}: DiscordChannelPickerProps) {
  const { data, loading, error, reload } = useDiscordChannels()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // API already filters to whitelisted categories.
  const allowedCategories: DiscordCategory[] = data?.categories ?? []
  const allChannels: DiscordTextChannel[] = allowedCategories.flatMap((c) => c.channels)
  const searchLower = search.toLowerCase()

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((s) => s !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  // ─── CATEGORY MODE — multi-select with checkboxes ───────────────────────
  if (mode === 'category') {
    const filteredCategories = allowedCategories.filter((cat) =>
      cat.name.toLowerCase().includes(searchLower),
    )
    const selectedCategories = selectedIds
      .map((id) => allowedCategories.find((cat) => cat.id === id))
      .filter(Boolean) as DiscordCategory[]

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
              ? 'Select categories...'
              : `${selectedIds.length} categor${selectedIds.length === 1 ? 'y' : 'ies'} selected`}
          </span>
          <ChevronDown
            className={`size-4 flex-shrink-0 text-ev-text-tertiary transition-transform duration-200 ${
              open ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>

        {/* Selected chips */}
        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedCategories.map((cat) => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1 rounded-md bg-ev-tertiary px-2 py-0.5 text-xs font-medium text-ev-text-secondary"
              >
                <FolderOpen className="size-3" />
                {cat.name}
                <button
                  type="button"
                  onClick={() => toggle(cat.id)}
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
                    onClick={() => reload()}
                    className="text-xs underline text-ev-text-accent"
                  >
                    Retry
                  </button>
                </div>
              )}

              {data && filteredCategories.length === 0 && (
                <div className="py-6 text-center">
                  <span className="text-xs text-ev-text-tertiary">
                    {search ? 'No categories match your search' : 'No categories found'}
                  </span>
                </div>
              )}

              {filteredCategories.map((cat) => {
                const selected = selectedIds.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggle(cat.id)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-white/[0.03] ${
                      selected
                        ? 'text-ev-text-primary bg-white/[0.04]'
                        : 'text-ev-text-secondary'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center size-4 rounded border flex-shrink-0 transition-colors ${
                        selected
                          ? 'border-ev-text-accent bg-ev-text-accent'
                          : 'border-ev-border-default bg-transparent'
                      }`}
                    >
                      {selected && (
                        <svg
                          className="size-3"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                        >
                          <path d="M2.5 6l2.5 2.5 4.5-5" />
                        </svg>
                      )}
                    </div>
                    <FolderOpen className="size-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate">{cat.name}</span>
                    <span className="ml-auto text-xs text-ev-text-tertiary">
                      {cat.channels.length} ch.
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Manual fallback when API fails */}
        {error && !open && (
          <Input
            placeholder="Or enter category IDs manually (comma-separated)"
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

  // ─── CHANNELS MODE — multi-select ─────────────────────────────────────────
  const selectedChannels = selectedIds
    .map((id) => allChannels.find((ch) => ch.id === id))
    .filter(Boolean) as DiscordTextChannel[]

  const filteredCategoriesForChannels = allowedCategories
    .map((cat) => {
      const categoryMatches = searchLower && cat.name.toLowerCase().includes(searchLower)
      return {
        ...cat,
        channels: categoryMatches
          ? cat.channels
          : cat.channels.filter((ch) => ch.name.toLowerCase().includes(searchLower)),
      }
    })
    .filter((cat) => cat.channels.length > 0)

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
      {selectedChannels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedChannels.map((ch) => (
            <span
              key={ch.id}
              className="inline-flex items-center gap-1 rounded-md bg-ev-tertiary px-2 py-0.5 text-xs font-medium text-ev-text-secondary"
            >
              <ChannelIcon type={ch.type} className="size-3" />
              {ch.name}
              <button
                type="button"
                onClick={() => toggle(ch.id)}
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
                  onClick={() => reload()}
                  className="text-xs underline text-ev-text-accent"
                >
                  Retry
                </button>
              </div>
            )}

            {data && filteredCategoriesForChannels.length === 0 && (
              <div className="py-6 text-center">
                <span className="text-xs text-ev-text-tertiary">
                  {search ? 'No channels match your search' : 'No channels found'}
                </span>
              </div>
            )}

            {filteredCategoriesForChannels.map((cat) => (
              <div key={cat.id}>
                <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-ev-text-tertiary">
                  {cat.name}
                </div>
                {cat.channels.map((ch) => (
                  <ChannelRow
                    key={ch.id}
                    channel={ch}
                    selected={selectedIds.includes(ch.id)}
                    onToggle={() => toggle(ch.id)}
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

      <ChannelIcon type={channel.type} className="size-3.5 flex-shrink-0 text-muted-foreground" />
      <span className="truncate">{channel.name}</span>
    </button>
  )
}
