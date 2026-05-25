'use client'

import { useState, useMemo, useOptimistic, useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Pencil,
  Loader2,
  Globe,
  Folder,
} from 'lucide-react'
import { deleteKeywords } from '@/lib/actions/keywords'
import { toggleKeywordAutostart } from '@/lib/actions/silently'
import { toggleKeywordPushover } from '@/lib/actions/pushover'
import { toggleKeywordDm } from '@/lib/actions/dm'
import { useAction } from '@/hooks/use-action'
import { KeywordDialog } from './keyword-dialog'
import { useDiscordChannels } from './use-discord-channels'
import type { Keyword } from '@/types'

const MAX_BADGES = 3

function ScopeBadges({
  channelIds,
  categoryIds,
  channelNameMap,
  categoryNameMap,
}: {
  channelIds: string[]
  categoryIds: string[]
  channelNameMap: Map<string, string>
  categoryNameMap: Map<string, string>
}) {
  const channels = channelIds.map((id) => ({
    id,
    name: channelNameMap.get(id) ?? id.slice(-4),
  }))
  const categories = categoryIds.map((id) => ({
    id,
    name: categoryNameMap.get(id) ?? id.slice(-4),
  }))

  const visibleChannels = channels.slice(0, MAX_BADGES)
  const visibleCategories = categories.slice(0, MAX_BADGES)
  const extraChannels = channels.slice(MAX_BADGES)
  const extraCategories = categories.slice(MAX_BADGES)

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visibleCategories.map((cat) => (
        <span
          key={`cat-${cat.id}`}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-ev-border-subtle bg-white/[0.03] text-[10px] font-medium uppercase tracking-wide text-ev-text-secondary"
          title={`Category: ${cat.name}`}
        >
          <Folder className="size-2.5" />
          {cat.name}
        </span>
      ))}
      {extraCategories.length > 0 && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded border border-ev-border-subtle bg-white/[0.03] text-[10px] font-medium text-ev-text-tertiary"
          title={extraCategories.map((c) => c.name).join(', ')}
        >
          +{extraCategories.length}
        </span>
      )}

      {visibleChannels.map((ch) => (
        <span
          key={`ch-${ch.id}`}
          className="inline-flex items-center px-1.5 py-0.5 rounded border border-ev-border-subtle bg-white/[0.03] text-[10px] font-mono text-ev-text-secondary"
          title={`Channel: #${ch.name}`}
        >
          #{ch.name}
        </span>
      ))}
      {extraChannels.length > 0 && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded border border-ev-border-subtle bg-white/[0.03] text-[10px] font-medium text-ev-text-tertiary"
          title={extraChannels.map((c) => `#${c.name}`).join(', ')}
        >
          +{extraChannels.length}
        </span>
      )}
    </div>
  )
}

type SortField = 'keyword' | 'internal_name' | 'created_at'
type SortDir = 'asc' | 'desc'

interface KeywordTableProps {
  keywords: Keyword[]
  disabledKeywords: string[]
  /**
   * Global silently_settings.min_stock — shown as fallback label for keywords
   * whose per-keyword min_stock is NULL (inheriting the global value).
   */
  globalMinStock?: number
  pushoverDisabledKeywords: string[]
  pushoverGlobalEnabled: boolean
  dmDisabledKeywords: string[]
  pingerGlobalEnabled: boolean
}

export function KeywordTable({ keywords, disabledKeywords, globalMinStock, pushoverDisabledKeywords, pushoverGlobalEnabled, dmDisabledKeywords, pingerGlobalEnabled }: KeywordTableProps) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null)
  const [deletingKeyword, setDeletingKeyword] = useState<Keyword | null>(null)

  const { data: discordData } = useDiscordChannels()

  const channelNameMap = useMemo(() => {
    const m = new Map<string, string>()
    if (!discordData) return m
    for (const cat of discordData.categories) {
      for (const ch of cat.channels) m.set(ch.id, ch.name)
    }
    for (const ch of discordData.uncategorized) m.set(ch.id, ch.name)
    return m
  }, [discordData])

  const categoryNameMap = useMemo(() => {
    const m = new Map<string, string>()
    if (!discordData) return m
    for (const cat of discordData.categories) m.set(cat.id, cat.name)
    return m
  }, [discordData])

  const { execute: executeDelete, isPending } = useAction(deleteKeywords, {
    successMessage: 'Keyword deleted',
    onSuccess: () => {
      setSelected(new Set())
      setDeletingKeyword(null)
    },
  })

  const [isAutostartPending, startAutostartTransition] = useTransition()
  const [optimisticDisabled, setOptimisticDisabled] = useOptimistic(
    disabledKeywords,
    (current: string[], { keyword, enabled }: { keyword: string; enabled: boolean }) => {
      if (enabled) {
        return current.filter((k) => k !== keyword)
      }
      return [...current, keyword]
    },
  )

  const { execute: executeAutostart } = useAction(
    (input: { keyword: string; enabled: boolean }) =>
      toggleKeywordAutostart(input.keyword, input.enabled),
  )

  const handleAutostartToggle = (keyword: string, enabled: boolean) => {
    startAutostartTransition(() => {
      setOptimisticDisabled({ keyword, enabled })
      executeAutostart({ keyword, enabled })
    })
  }

  const [isPushoverPending, startPushoverTransition] = useTransition()
  const [optimisticPushoverDisabled, setOptimisticPushoverDisabled] = useOptimistic(
    pushoverDisabledKeywords,
    (current: string[], { keywordId, enabled }: { keywordId: string; enabled: boolean }) => {
      if (enabled) {
        return current.filter((k) => k !== keywordId)
      }
      return [...current, keywordId]
    },
  )

  const { execute: executePushover } = useAction(
    (input: { keywordId: string; enabled: boolean }) =>
      toggleKeywordPushover(input.keywordId, input.enabled),
  )

  const handlePushoverToggle = (keywordId: string, enabled: boolean) => {
    startPushoverTransition(() => {
      setOptimisticPushoverDisabled({ keywordId, enabled })
      executePushover({ keywordId, enabled })
    })
  }

  const [isDmPending, startDmTransition] = useTransition()
  const [optimisticDmDisabled, setOptimisticDmDisabled] = useOptimistic(
    dmDisabledKeywords,
    (current: string[], { keywordId, enabled }: { keywordId: string; enabled: boolean }) => {
      if (enabled) {
        return current.filter((k) => k !== keywordId)
      }
      return [...current, keywordId]
    },
  )

  const { execute: executeDm } = useAction(
    (input: { keywordId: string; enabled: boolean }) =>
      toggleKeywordDm(input.keywordId, input.enabled),
  )

  const handleDmToggle = (keywordId: string, enabled: boolean) => {
    startDmTransition(() => {
      setOptimisticDmDisabled({ keywordId, enabled })
      executeDm({ keywordId, enabled })
    })
  }

  const disabledSet = useMemo(
    () => new Set(optimisticDisabled.map((k) => k.toLowerCase())),
    [optimisticDisabled],
  )

  const pushoverDisabledSet = useMemo(
    () => new Set(optimisticPushoverDisabled),
    [optimisticPushoverDisabled],
  )

  const dmDisabledSet = useMemo(
    () => new Set(optimisticDmDisabled),
    [optimisticDmDisabled],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    let result = keywords
    if (q) {
      result = result.filter(
        (kw) =>
          kw.keyword.toLowerCase().includes(q) ||
          kw.internal_name?.toLowerCase().includes(q),
      )
    }
    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortField === 'keyword') {
        cmp = a.keyword.localeCompare(b.keyword)
      } else if (sortField === 'internal_name') {
        cmp = (a.internal_name ?? '').localeCompare(b.internal_name ?? '')
      } else {
        cmp =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [keywords, search, sortField, sortDir])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const allSelected =
    filtered.length > 0 && filtered.every((kw) => selected.has(kw.id))

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((kw) => kw.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDelete = () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    executeDelete(ids)
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field)
      return <ArrowUpDown className="size-3 opacity-40" />
    return sortDir === 'asc' ? (
      <ArrowUp className="size-3" />
    ) : (
      <ArrowDown className="size-3" />
    )
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 pointer-events-none text-ev-text-tertiary" />
          <Input
            placeholder="Search keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8"
          />
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-ev-text-secondary">
              {selected.size} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-3.5 mr-1 animate-spin" />
              ) : (
                <Trash2 className="size-3.5 mr-1" />
              )}
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-ev-border-subtle hover:bg-transparent">
              <TableHead className="w-10">
                <label className="flex items-center justify-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="size-3.5 rounded cursor-pointer accent-[var(--primary)]"
                  />
                </label>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort('keyword')}
                  className="flex items-center gap-1 text-ev-text-secondary transition-colors"
                >
                  Keyword
                  {renderSortIcon('keyword')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort('internal_name')}
                  className="flex items-center gap-1 text-ev-text-secondary transition-colors"
                >
                  Name
                  {renderSortIcon('internal_name')}
                </button>
              </TableHead>
              <TableHead>
                <span className="text-ev-text-secondary">Max Price</span>
              </TableHead>
              <TableHead>
                <span className="text-ev-text-secondary">Min Stock</span>
              </TableHead>
              <TableHead>
                <span className="text-ev-text-secondary">Autostart</span>
              </TableHead>
              <TableHead>
                <span className="text-ev-text-secondary">Pushover</span>
              </TableHead>
              <TableHead>
                <span className="text-ev-text-secondary">DM</span>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort('created_at')}
                  className="flex items-center gap-1 text-ev-text-secondary transition-colors"
                >
                  Added
                  {renderSortIcon('created_at')}
                </button>
              </TableHead>
              <TableHead className="w-20">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-ev-text-tertiary"
                >
                  {search
                    ? 'No keywords match your search.'
                    : 'No keywords configured yet.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((kw) => {
                const isDisabled = disabledSet.has(kw.keyword.toLowerCase())
                const isSelected = selected.has(kw.id)

                return (
                  <TableRow
                    key={kw.id}
                    data-state={isSelected ? 'selected' : undefined}
                    className={`group border-ev-border-subtle transition-colors ${
                      isSelected ? 'bg-white/[0.04]' : ''
                    }`}
                  >
                    <TableCell>
                      <label className="flex items-center justify-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(kw.id)}
                          className="size-3.5 rounded cursor-pointer accent-[var(--primary)]"
                        />
                      </label>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[13px] font-medium text-ev-text-accent">
                            {kw.keyword}
                          </span>
                          {!kw.channel_ids?.length && !kw.category_ids?.length && (
                            <span
                              title="Global — matches in all categories and channels"
                              className="inline-flex items-center"
                            >
                              <Globe className="size-3 text-ev-text-tertiary" />
                            </span>
                          )}
                        </div>
                        {(kw.channel_ids?.length || kw.category_ids?.length) ? (
                          <ScopeBadges
                            channelIds={kw.channel_ids ?? []}
                            categoryIds={kw.category_ids ?? []}
                            channelNameMap={channelNameMap}
                            categoryNameMap={categoryNameMap}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm truncate max-w-[160px] ${
                          kw.internal_name
                            ? 'text-ev-text-primary'
                            : 'text-ev-text-tertiary'
                        }`}
                      >
                        {kw.internal_name ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {kw.max_price != null ? (
                        <span className="font-mono text-xs text-ev-text-secondary">
                          ${kw.max_price.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs text-ev-text-tertiary">
                          --
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {kw.min_stock != null ? (
                        <span className="font-mono text-xs text-ev-text-secondary tabular-nums">
                          {kw.min_stock}
                        </span>
                      ) : (
                        <span
                          className="text-xs text-ev-text-tertiary"
                          title="No per-keyword value — uses the global autostart threshold"
                        >
                          {globalMinStock != null
                            ? `Global (${globalMinStock})`
                            : 'Global'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block size-1.5 rounded-full flex-shrink-0 ${
                            isDisabled ? 'bg-ev-text-tertiary' : 'bg-ev-success'
                          }`}
                        />
                        <Switch
                          checked={!isDisabled}
                          onCheckedChange={(checked) =>
                            handleAutostartToggle(kw.keyword, checked)
                          }
                          disabled={isAutostartPending}
                          size="sm"
                          aria-label={`Autostart for ${kw.keyword}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const isPushoverOff = pushoverDisabledSet.has(kw.id)
                        return (
                          <div
                            className="flex items-center gap-2"
                            title={!pushoverGlobalEnabled ? 'Pushover global deaktiviert' : undefined}
                          >
                            <span
                              className={`inline-block size-1.5 rounded-full flex-shrink-0 ${
                                !pushoverGlobalEnabled || isPushoverOff ? 'bg-ev-text-tertiary' : 'bg-ev-success'
                              }`}
                            />
                            <Switch
                              checked={pushoverGlobalEnabled && !isPushoverOff}
                              onCheckedChange={(checked) =>
                                handlePushoverToggle(kw.id, checked)
                              }
                              disabled={isPushoverPending || !pushoverGlobalEnabled}
                              size="sm"
                              aria-label={`Pushover for ${kw.keyword}`}
                            />
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const isDmOff = dmDisabledSet.has(kw.id)
                        return (
                          <div
                            className="flex items-center gap-2"
                            title={!pingerGlobalEnabled ? 'Pinger global deaktiviert' : undefined}
                          >
                            <span
                              className={`inline-block size-1.5 rounded-full flex-shrink-0 ${
                                !pingerGlobalEnabled || isDmOff ? 'bg-ev-text-tertiary' : 'bg-ev-success'
                              }`}
                            />
                            <Switch
                              checked={pingerGlobalEnabled && !isDmOff}
                              onCheckedChange={(checked) =>
                                handleDmToggle(kw.id, checked)
                              }
                              disabled={isDmPending || !pingerGlobalEnabled}
                              size="sm"
                              aria-label={`DM for ${kw.keyword}`}
                            />
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs tabular-nums text-ev-text-tertiary">
                        {new Date(kw.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: '2-digit',
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="w-20">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingKeyword(kw)}
                          aria-label={`Edit ${kw.keyword}`}
                          className="flex items-center justify-center size-7 rounded-md text-ev-text-tertiary opacity-60 hover:opacity-100 hover:bg-white/[0.05] transition-all"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingKeyword(kw)}
                          aria-label={`Delete ${kw.keyword}`}
                          className="flex items-center justify-center size-7 rounded-md text-ev-text-tertiary opacity-60 hover:opacity-100 hover:bg-white/[0.05] hover:text-red-400 transition-all"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog — rendered once, controlled by editingKeyword */}
      <KeywordDialog
        keyword={editingKeyword ?? undefined}
        open={!!editingKeyword}
        onOpenChange={(next) => {
          if (!next) setEditingKeyword(null)
        }}
        trigger={null}
        globalMinStock={globalMinStock}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deletingKeyword}
        onOpenChange={(next) => {
          if (!next) setDeletingKeyword(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete keyword?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deletingKeyword?.keyword}&rdquo; will be permanently
              deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (deletingKeyword) executeDelete([deletingKeyword.id])
              }}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 mr-1 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5 mr-1" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
