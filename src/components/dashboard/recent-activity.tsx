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

export function RecentActivity({ logs }: RecentActivityProps) {
  return (
    <div className="glass-card overflow-hidden">
      {/* Section header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Inbox className="size-4" style={{ color: 'var(--text-tertiary)' }} />
          <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Recent Activity
          </h2>
        </div>
        <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
          Last {logs.length} entries
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div
            className="flex items-center justify-center size-10 rounded-xl mb-3"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <Inbox className="size-5" style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            No activity yet
          </p>
          <p className="text-xs mt-1 text-center max-w-[240px]" style={{ color: 'var(--text-tertiary)' }}>
            Notifications will appear here once your pinger finds matches.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent" style={{ borderColor: 'var(--border-subtle)' }}>
              <TableHead className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Keyword
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Channel
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-center" style={{ color: 'var(--text-tertiary)' }}>
                Actions
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-right" style={{ color: 'var(--text-tertiary)' }}>
                Time
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                className="border-b transition-colors duration-150 glass-table-row"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    <span className="size-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--text-accent)' }} />
                    {log.keyword_text}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm truncate max-w-[140px] inline-block" style={{ color: 'var(--text-secondary)' }}>
                    {log.channel_name ?? 'Unknown'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1.5">
                    <div
                      className="flex items-center justify-center size-6 rounded-md"
                      title={log.dm_sent ? 'DM sent' : 'DM not sent'}
                      style={{ backgroundColor: log.dm_sent ? 'rgba(48,209,88,0.08)' : 'var(--bg-tertiary)' }}
                    >
                      <MessageSquare className="size-3" style={{ color: log.dm_sent ? 'var(--success)' : 'var(--text-tertiary)' }} />
                    </div>
                    <div
                      className="flex items-center justify-center size-6 rounded-md"
                      title={log.pushover_sent ? 'Push sent' : 'Push not sent'}
                      style={{ backgroundColor: log.pushover_sent ? 'rgba(48,209,88,0.08)' : 'var(--bg-tertiary)' }}
                    >
                      <Bell className="size-3" style={{ color: log.pushover_sent ? 'var(--success)' : 'var(--text-tertiary)' }} />
                    </div>
                    <div
                      className="flex items-center justify-center size-6 rounded-md"
                      title={log.silently_triggered ? (log.silently_success ? 'Autostart success' : 'Autostart failed') : 'Not triggered'}
                      style={{
                        backgroundColor: log.silently_triggered
                          ? (log.silently_success ? 'rgba(48,209,88,0.08)' : 'rgba(255,69,58,0.08)')
                          : 'var(--bg-tertiary)',
                      }}
                    >
                      <ShoppingCart
                        className="size-3"
                        style={{
                          color: log.silently_triggered
                            ? (log.silently_success ? 'var(--success)' : 'var(--error)')
                            : 'var(--text-tertiary)',
                        }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
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
