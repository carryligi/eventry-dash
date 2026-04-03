'use client'

import { useState, useMemo, useTransition, useRef, useEffect } from 'react'
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
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
  X,
  Pencil,
} from 'lucide-react'
import { deleteKeywords, updateKeywordName } from '@/lib/actions/keywords'
import type { Keyword } from '@/types'

type SortField = 'keyword' | 'internal_name' | 'created_at'
type SortDir = 'asc' | 'desc'

interface KeywordTableProps {
  keywords: Keyword[]
  disabledKeywords: string[]
}

function InlineNameEditor({
  keyword,
}: {
  keyword: Keyword
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(keyword.internal_name ?? '')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const save = () => {
    const trimmed = value.trim()
    if (trimmed !== (keyword.internal_name ?? '')) {
      startTransition(async () => {
        await updateKeywordName(keyword.id, trimmed)
      })
    }
    setEditing(false)
  }

  const cancel = () => {
    setValue(keyword.internal_name ?? '')
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') cancel()
          }}
          onBlur={save}
          disabled={isPending}
          className="h-6 w-full min-w-[80px] rounded px-1.5 text-sm bg-transparent outline-none transition-colors"
          style={{
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={save}
          className="flex items-center justify-center size-5 rounded transition-colors"
          style={{ color: 'var(--success)' }}
        >
          <Check className="size-3" />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={cancel}
          className="flex items-center justify-center size-5 rounded transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <X className="size-3" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group/edit flex items-center gap-1.5 text-left transition-colors rounded px-1 -mx-1 py-0.5"
      style={{ color: keyword.internal_name ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
    >
      <span className="truncate max-w-[140px]">
        {keyword.internal_name || 'Add name...'}
      </span>
      <Pencil
        className="size-3 opacity-0 group-hover/edit:opacity-60 transition-opacity flex-shrink-0"
      />
    </button>
  )
}

function ScopeDisplay({ keyword }: { keyword: Keyword }) {
  if (keyword.restriction_type === 'channels' && keyword.channel_ids?.length) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <Badge variant="outline" className="text-[10px] px-1.5 h-4">
          Channels
        </Badge>
        <span
          className="text-xs truncate max-w-[100px]"
          style={{ color: 'var(--text-tertiary)' }}
          title={keyword.channel_ids.join(', ')}
        >
          {keyword.channel_ids.length} ch.
        </span>
      </div>
    )
  }

  if (keyword.restriction_type === 'category' && keyword.category_id) {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="text-[10px] px-1.5 h-4">
          Category
        </Badge>
        <span
          className="text-xs truncate max-w-[100px]"
          style={{ color: 'var(--text-tertiary)' }}
          title={keyword.category_id}
        >
          {keyword.category_id}
        </span>
      </div>
    )
  }

  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
      Global
    </Badge>
  )
}

export function KeywordTable({ keywords, disabledKeywords }: KeywordTableProps) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const disabledSet = useMemo(
    () => new Set(disabledKeywords.map((k) => k.toLowerCase())),
    [disabledKeywords]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    let result = keywords
    if (q) {
      result = result.filter(
        (kw) =>
          kw.keyword.toLowerCase().includes(q) ||
          kw.internal_name?.toLowerCase().includes(q)
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
    startTransition(async () => {
      await deleteKeywords(ids)
      setSelected(new Set())
    })
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
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <Input
            placeholder="Search keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8"
          />
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span
              className="text-xs tabular-nums"
              style={{ color: 'var(--text-secondary)' }}
            >
              {selected.size} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="size-3.5 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {/* Subtle top-edge shine */}
        <div
          className="h-px pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent 100%)',
          }}
        />

        <Table>
          <TableHeader>
            <TableRow
              className="border-b hover:bg-transparent"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <TableHead className="w-10">
                <label className="flex items-center justify-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="size-3.5 rounded accent-[var(--primary)] cursor-pointer"
                  />
                </label>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort('keyword')}
                  className="flex items-center gap-1 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Keyword
                  {renderSortIcon("keyword")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort('internal_name')}
                  className="flex items-center gap-1 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Name
                  {renderSortIcon("internal_name")}
                </button>
              </TableHead>
              <TableHead>
                <span style={{ color: 'var(--text-secondary)' }}>Scope</span>
              </TableHead>
              <TableHead>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Max Price
                </span>
              </TableHead>
              <TableHead>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Autostart
                </span>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort('created_at')}
                  className="flex items-center gap-1 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Added
                  {renderSortIcon("created_at")}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="h-24 text-center"
                  style={{ color: 'var(--text-tertiary)' }}
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
                    className="transition-colors"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: isSelected
                        ? 'rgba(255,255,255,0.04)'
                        : undefined,
                    }}
                  >
                    <TableCell>
                      <label className="flex items-center justify-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(kw.id)}
                          className="size-3.5 rounded accent-[var(--primary)] cursor-pointer"
                        />
                      </label>
                    </TableCell>
                    <TableCell>
                      <span
                        className="font-mono text-[13px] font-medium"
                        style={{ color: 'var(--text-accent)' }}
                      >
                        {kw.keyword}
                      </span>
                    </TableCell>
                    <TableCell>
                      <InlineNameEditor keyword={kw} />
                    </TableCell>
                    <TableCell>
                      <ScopeDisplay keyword={kw} />
                    </TableCell>
                    <TableCell>
                      {kw.max_price != null ? (
                        <span
                          className="font-mono text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          ${kw.max_price.toFixed(2)}
                        </span>
                      ) : (
                        <span
                          className="text-xs"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          --
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isDisabled ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 h-4"
                        >
                          <span
                            className="inline-block size-1.5 rounded-full mr-0.5"
                            style={{ backgroundColor: 'var(--text-tertiary)' }}
                          />
                          Off
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 h-4"
                        >
                          <span
                            className="inline-block size-1.5 rounded-full mr-0.5"
                            style={{ backgroundColor: 'var(--success)' }}
                          />
                          On
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-xs tabular-nums"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {new Date(kw.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: '2-digit',
                        })}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
