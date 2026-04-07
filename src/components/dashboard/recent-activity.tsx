import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MessageSquare, Bell, ShoppingCart, Inbox } from 'lucide-react'
import type { NotificationLog } from '@/types'

interface RecentActivityProps {
  logs: NotificationLog[]
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

function ActionIcon({
  active,
  success,
  icon: Icon,
  title,
}: {
  active: boolean
  success?: boolean
  icon: typeof MessageSquare
  title: string
}) {
  const isError = active && success === false
  return (
    <div
      className={`flex items-center justify-center size-6 rounded-md ${
        active
          ? isError
            ? 'bg-ev-error/8'
            : 'bg-ev-success/8'
          : 'bg-ev-tertiary'
      }`}
      title={title}
    >
      <Icon
        className={`size-3 ${
          active
            ? isError
              ? 'text-ev-error'
              : 'text-ev-success'
            : 'text-ev-text-tertiary'
        }`}
      />
    </div>
  )
}

export function RecentActivity({ logs }: RecentActivityProps) {
  return (
    <div className="glass-card overflow-hidden">
      {/* Section header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-ev-border-subtle">
        <div className="flex items-center gap-2">
          <Inbox className="size-4 text-ev-text-tertiary" />
          <h2 className="text-sm font-medium text-ev-text-primary">
            Recent Activity
          </h2>
        </div>
        <span className="text-xs tabular-nums text-ev-text-tertiary">
          Last {logs.length} entries
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="flex items-center justify-center size-10 rounded-xl mb-3 bg-ev-tertiary">
            <Inbox className="size-5 text-ev-text-tertiary" />
          </div>
          <p className="text-sm font-medium text-ev-text-secondary">
            No activity yet
          </p>
          <p className="text-xs mt-1 text-center max-w-[240px] text-ev-text-tertiary">
            Notifications will appear here once your pinger finds matches.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-b border-ev-border-subtle hover:bg-transparent">
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
                Time
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                className="border-b border-ev-border-subtle transition-colors duration-150 glass-table-row"
              >
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
                    <ActionIcon
                      active={log.dm_sent}
                      icon={MessageSquare}
                      title={log.dm_sent ? 'DM sent' : 'DM not sent'}
                    />
                    <ActionIcon
                      active={log.pushover_sent}
                      icon={Bell}
                      title={log.pushover_sent ? 'Push sent' : 'Push not sent'}
                    />
                    <ActionIcon
                      active={log.silently_triggered}
                      success={log.silently_success ?? undefined}
                      icon={ShoppingCart}
                      title={
                        log.silently_triggered
                          ? log.silently_success
                            ? 'Autostart success'
                            : 'Autostart failed'
                          : 'Not triggered'
                      }
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-xs tabular-nums text-ev-text-tertiary">
                    {timeAgo(log.created_at)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
