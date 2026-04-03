'use client'

import { useState, useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  Bell,
  ShoppingCart,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Package,
} from 'lucide-react'
import { fetchNotificationLogs } from '@/lib/actions/notification-log'
import type { NotificationLog } from '@/types'

interface NotificationLogViewProps {
  initialLogs: NotificationLog[]
  totalCount: number
  keywords: string[]
}

function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const PAGE_SIZE = 20

export function NotificationLogView({
  initialLogs,
  totalCount,
  keywords,
}: NotificationLogViewProps) {
  const [logs, setLogs] = useState<NotificationLog[]>(initialLogs)
  const [count, setCount] = useState(totalCount)
  const [page, setPage] = useState(0)
  const [selectedKeyword, setSelectedKeyword] = useState<string>('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  const loadPage = (newPage: number, keyword?: string) => {
    startTransition(async () => {
      const result = await fetchNotificationLogs(
        newPage,
        keyword || undefined
      )
      setLogs(result.logs)
      setCount(result.totalCount)
      setPage(newPage)
    })
  }

  const handleKeywordChange = (value: string | null) => {
    const kw = !value || value === '__all__' ? '' : value
    setSelectedKeyword(kw)
    setExpandedRow(null)
    loadPage(0, kw)
  }

  const handlePrevPage = () => {
    if (page > 0) loadPage(page - 1, selectedKeyword)
  }

  const handleNextPage = () => {
    if (page < totalPages - 1) loadPage(page + 1, selectedKeyword)
  }

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id)
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Filter by keyword:
          </span>
          <Select
            value={selectedKeyword || '__all__'}
            onValueChange={handleKeywordChange}
          >
            <SelectTrigger
              size="sm"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)',
                minWidth: '160px',
              }}
            >
              <SelectValue placeholder="All keywords" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All keywords</SelectItem>
              {keywords.map((kw) => (
                <SelectItem key={kw} value={kw}>
                  {kw}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span
          className="text-xs tabular-nums"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {count} total {count === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Table */}
      <div
        className="relative rounded-xl overflow-hidden glass-card"
        style={{
          opacity: isPending ? 0.6 : 1,
          transition: 'opacity 200ms',
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent 100%)',
          }}
        />

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div
              className="flex items-center justify-center size-10 rounded-xl mb-3"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <Inbox
                className="size-5"
                style={{ color: 'var(--text-tertiary)' }}
              />
            </div>
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              No notifications found
            </p>
            <p
              className="text-xs mt-1 text-center max-w-[240px]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {selectedKeyword
                ? 'No entries match the selected keyword filter.'
                : 'Notifications will appear here once your pinger finds matches.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow
                className="border-b hover:bg-transparent"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <TableHead
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Time
                </TableHead>
                <TableHead
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Keyword
                </TableHead>
                <TableHead
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Channel
                </TableHead>
                <TableHead
                  className="text-xs font-medium uppercase tracking-wider text-center"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Actions
                </TableHead>
                <TableHead
                  className="text-xs font-medium uppercase tracking-wider text-right"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Stock
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <>
                  <TableRow
                    key={log.id}
                    className="border-b transition-colors duration-200 cursor-pointer"
                    style={{
                      borderColor: expandedRow === log.id ? 'transparent' : 'var(--border-subtle)',
                    }}
                    onClick={() => toggleRow(log.id)}
                  >
                    <TableCell>
                      <span
                        className="text-xs tabular-nums whitespace-nowrap"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {timeAgo(log.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1.5 text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <span
                          className="size-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: 'var(--text-accent)' }}
                        />
                        {log.keyword_text}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-sm truncate max-w-[140px] inline-block"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {log.channel_name ?? 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        {/* DM */}
                        <div
                          className="flex items-center justify-center size-6 rounded-md"
                          title={log.dm_sent ? 'DM sent' : 'DM not sent'}
                          style={{
                            backgroundColor: log.dm_sent
                              ? 'rgba(74,222,128,0.08)'
                              : 'var(--bg-tertiary)',
                          }}
                        >
                          <MessageSquare
                            className="size-3"
                            style={{
                              color: log.dm_sent
                                ? 'var(--success)'
                                : 'var(--text-tertiary)',
                            }}
                          />
                        </div>
                        {/* Push */}
                        <div
                          className="flex items-center justify-center size-6 rounded-md"
                          title={log.pushover_sent ? 'Push sent' : 'Push not sent'}
                          style={{
                            backgroundColor: log.pushover_sent
                              ? 'rgba(74,222,128,0.08)'
                              : 'var(--bg-tertiary)',
                          }}
                        >
                          <Bell
                            className="size-3"
                            style={{
                              color: log.pushover_sent
                                ? 'var(--success)'
                                : 'var(--text-tertiary)',
                            }}
                          />
                        </div>
                        {/* Silently / QT */}
                        <div
                          className="flex items-center justify-center size-6 rounded-md"
                          title={
                            log.silently_triggered
                              ? log.silently_success
                                ? 'Autostart success'
                                : 'Autostart failed'
                              : 'Not triggered'
                          }
                          style={{
                            backgroundColor: log.silently_triggered
                              ? log.silently_success
                                ? 'rgba(74,222,128,0.08)'
                                : 'rgba(248,113,113,0.08)'
                              : 'var(--bg-tertiary)',
                          }}
                        >
                          <ShoppingCart
                            className="size-3"
                            style={{
                              color: log.silently_triggered
                                ? log.silently_success
                                  ? 'var(--success)'
                                  : 'var(--error)'
                                : 'var(--text-tertiary)',
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {log.stock_value != null ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs tabular-nums font-medium"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Package className="size-3" style={{ color: 'var(--text-tertiary)' }} />
                          {log.stock_value}
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
                  </TableRow>

                  {/* Expanded detail row */}
                  {expandedRow === log.id && (
                    <TableRow
                      key={`${log.id}-detail`}
                      className="border-b"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <TableCell colSpan={5}>
                        <div
                          className="rounded-lg px-3 py-2 flex items-center justify-between"
                          style={{
                            backgroundColor: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <span
                              className="text-xs"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              {new Date(log.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                            {log.channel_id && (
                              <span
                                className="text-xs font-mono"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                Channel: {log.channel_id}
                              </span>
                            )}
                          </div>
                          {log.message_url && (
                            <a
                              href={log.message_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
                              style={{ color: 'var(--text-accent)' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="size-3" />
                              View Message
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {count > PAGE_SIZE && (
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2 glass-card"
        >
          <span
            className="text-xs tabular-nums"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handlePrevPage}
              disabled={page === 0 || isPending}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleNextPage}
              disabled={page >= totalPages - 1 || isPending}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
