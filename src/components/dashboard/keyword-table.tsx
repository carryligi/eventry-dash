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
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import { deleteKeywords } from '@/lib/actions/keywords'
import { toggleKeywordAutostart } from '@/lib/actions/silently'
import { useAction } from '@/hooks/use-action'
import { KeywordDialog } from './keyword-dialog'
import type { Keyword } from '@/types'

type SortField = 'keyword' | 'internal_name' | 'created_at'
type SortDir = 'asc' | 'desc'

interface KeywordTableProps {
  keywords: Keyword[]
  disabledKeywords: string[]
}

function ScopeDisplay({ keyword }: { keyword: Keyword }) {
  const chCount = keyword.channel_ids?.length ?? 0
  const catCount = keyword.category_ids?.length ?? 0
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {chCount > 0 && (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 h-4"
          title={keyword.channel_ids?.join(', ')}
        >
          {chCount} ch
        </Badge>
      )}
      {catCount > 0 && (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 h-4"
          title={keyword.category_ids?.join(', ')}
        >
          {catCount} cat
        </Badge>
      )}
      {chCount === 0 && catCount === 0 && (
        <span className="text-xs text-ev-text-tertiary">—</span>
      )}
    </div>
  )
}

export function KeywordTable({ keywords, disabledKeywords }: KeywordTableProps) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null)
  const [deletingKeyword, setDeletingKeyword] = useState<Keyword | null>(null)

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

  const disabledSet = useMemo(
    () => new Set(optimisticDisabled.map((k) => k.toLowerCase())),
    [optimisticDisabled],
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
                <span className="text-ev-text-secondary">Scope</span>
              </TableHead>
              <TableHead>
                <span className="text-ev-text-secondary">Max Price</span>
              </TableHead>
              <TableHead>
                <span className="text-ev-text-secondary">Autostart</span>
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
                  colSpan={8}
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
                      <span className="font-mono text-[13px] font-medium text-ev-text-accent">
                        {kw.keyword}
                      </span>
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
                      <ScopeDisplay keyword={kw} />
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
            <AlertDialogTitle>Keyword löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{deletingKeyword?.keyword}“ wird dauerhaft gelöscht. Diese
              Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
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
                  Lösche…
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5 mr-1" />
                  Löschen
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
