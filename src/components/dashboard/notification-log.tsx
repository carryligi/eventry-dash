'use client'

import { Fragment, useState, useTransition } from 'react'
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
  Webhook,
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
      const result = await fetchNotificationLogs(newPage, keyword || undefined)
      if (result.success) {
        setLogs(result.data.logs)
        setCount(result.data.totalCount)
      }
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
          <span className="text-sm font-medium text-ev-text-secondary">
            Filter by keyword:
          </span>
          <Select
            value={selectedKeyword || '__all__'}
            onValueChange={handleKeywordChange}
          >
            <SelectTrigger
              size="sm"
              className="bg-ev-tertiary border-ev-border-default text-ev-text-primary min-w-[160px]"
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

        <span className="text-xs tabular-nums text-ev-text-tertiary">
          {count} total {count === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Table */}
      <div
        className={`relative rounded-xl overflow-hidden glass-card transition-opacity duration-200 ${
          isPending ? 'opacity-60' : ''
        }`}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="flex items-center justify-center size-10 rounded-xl mb-3 bg-ev-tertiary">
              <Inbox className="size-5 text-ev-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-ev-text-secondary">
              No notifications found
            </p>
            <p className="text-xs mt-1 text-center max-w-[240px] text-ev-text-tertiary">
              {selectedKeyword
                ? 'No entries match the selected keyword filter.'
                : 'Notifications will appear here once your pinger finds matches.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-ev-border-subtle hover:bg-transparent">
                <TableHead className="text-xs font-medium uppercase tracking-wider text-ev-text-tertiary">
                  Time
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-ev-text-tertiary">
                  Keyword
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-ev-text-tertiary">
                  Channel
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-center text-ev-text-tertiary">
                  Actions
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-right text-ev-text-tertiary">
                  Stock
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <Fragment key={log.id}>
                  <TableRow
                    className={`border-b transition-colors duration-200 cursor-pointer ${
                      expandedRow === log.id
                        ? 'border-transparent'
                        : 'border-ev-border-subtle'
                    }`}
                    onClick={() => toggleRow(log.id)}
                  >
                    <TableCell>
                      <span className="text-xs tabular-nums whitespace-nowrap text-ev-text-tertiary">
                        {timeAgo(log.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ev-text-primary">
                        <span className="size-1.5 rounded-full flex-shrink-0 bg-ev-text-accent" />
                        {log.keyword_text}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm truncate max-w-[140px] inline-block text-ev-text-secondary">
                        {log.channel_name ?? 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        {/* DM */}
                        <div
                          className={`flex items-center justify-center size-6 rounded-md ${
                            log.dm_sent ? 'bg-ev-success/10' : 'bg-ev-tertiary'
                          }`}
                          title={log.dm_sent ? 'DM sent' : 'DM not sent'}
                        >
                          <MessageSquare
                            className={`size-3 ${
                              log.dm_sent ? 'text-ev-success' : 'text-ev-text-tertiary'
                            }`}
                          />
                        </div>
                        {/* Push */}
                        <div
                          className={`flex items-center justify-center size-6 rounded-md ${
                            log.pushover_sent ? 'bg-ev-success/10' : 'bg-ev-tertiary'
                          }`}
                          title={log.pushover_sent ? 'Push sent' : 'Push not sent'}
                        >
                          <Bell
                            className={`size-3 ${
                              log.pushover_sent ? 'text-ev-success' : 'text-ev-text-tertiary'
                            }`}
                          />
                        </div>
                        {/* Silently / QT */}
                        <div
                          className={`flex items-center justify-center size-6 rounded-md ${
                            log.silently_triggered
                              ? log.silently_success
                                ? 'bg-ev-success/10'
                                : 'bg-ev-error/10'
                              : 'bg-ev-tertiary'
                          }`}
                          title={
                            log.silently_triggered
                              ? log.silently_success
                                ? 'Autostart success'
                                : 'Autostart failed'
                              : 'Not triggered'
                          }
                        >
                          <ShoppingCart
                            className={`size-3 ${
                              log.silently_triggered
                                ? log.silently_success
                                  ? 'text-ev-success'
                                  : 'text-ev-error'
                                : 'text-ev-text-tertiary'
                            }`}
                          />
                        </div>
                        {/* Webhook */}
                        <div
                          className={`flex items-center justify-center size-6 rounded-md ${
                            log.webhook_sent ? 'bg-ev-success/10' : 'bg-ev-tertiary'
                          }`}
                          title={log.webhook_sent ? 'Webhook sent' : 'Webhook not sent'}
                        >
                          <Webhook
                            className={`size-3 ${
                              log.webhook_sent ? 'text-ev-success' : 'text-ev-text-tertiary'
                            }`}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {log.stock_value != null ? (
                        <span className="inline-flex items-center gap-1 text-xs tabular-nums font-medium text-ev-text-secondary">
                          <Package className="size-3 text-ev-text-tertiary" />
                          {log.stock_value}
                        </span>
                      ) : (
                        <span className="text-xs text-ev-text-tertiary">--</span>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Expanded detail row */}
                  {expandedRow === log.id && (
                    <TableRow className="border-b border-ev-border-subtle">
                      <TableCell colSpan={5}>
                        <div className="rounded-lg px-3 py-2 flex items-center justify-between bg-ev-tertiary border border-ev-border-subtle">
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-ev-text-tertiary">
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
                              <span className="text-xs font-mono text-ev-text-tertiary">
                                Channel: {log.channel_id}
                              </span>
                            )}
                          </div>
                          {log.message_url && (
                            <a
                              href={log.message_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80 text-ev-text-accent"
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
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {count > PAGE_SIZE && (
        <div className="flex items-center justify-between rounded-lg px-3 py-2 glass-card">
          <span className="text-xs tabular-nums text-ev-text-tertiary">
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
