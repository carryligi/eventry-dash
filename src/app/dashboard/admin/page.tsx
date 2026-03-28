import { createServerClient } from '@/lib/supabase/server'
import {
  Users,
  Tag,
  Zap,
  CalendarClock,
  Inbox,
  MessageSquare,
  Bell,
  ShoppingCart,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { NotificationLog } from '@/types'

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

export default async function AdminOverviewPage() {
  const supabase = await createServerClient()

  const [
    { count: totalUsers },
    { count: totalKeywords },
    { count: activePingers },
    { count: todayMatches },
    { data: activeUsers },
    { data: recentLogs },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('pinger_settings')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().split('T')[0]),
    supabase
      .from('pinger_settings')
      .select('user_id, is_active, profiles!inner(discord_username, discord_avatar)')
      .eq('is_active', true)
      .limit(10),
    supabase
      .from('notification_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const stats = [
    {
      label: 'Total Users',
      value: totalUsers ?? 0,
      subtext: 'Registered users',
      icon: Users,
    },
    {
      label: 'Total Keywords',
      value: totalKeywords ?? 0,
      subtext: 'Across all users',
      icon: Tag,
    },
    {
      label: 'Active Pingers',
      value: activePingers ?? 0,
      subtext: 'Currently monitoring',
      icon: Zap,
      highlight: true,
    },
    {
      label: "Today's Matches",
      value: todayMatches ?? 0,
      subtext: 'Since midnight',
      icon: CalendarClock,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="group relative rounded-xl overflow-hidden transition-all duration-300"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{
                  background: stat.highlight
                    ? 'linear-gradient(90deg, transparent 0%, var(--success) 30%, var(--success) 70%, transparent 100%)'
                    : 'linear-gradient(90deg, transparent 0%, rgba(192,192,192,0.08) 30%, rgba(192,192,192,0.08) 70%, transparent 100%)',
                }}
              />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 0%, rgba(192,192,192,0.03) 0%, transparent 70%)',
                }}
              />
              <div className="relative px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-xs font-medium uppercase tracking-widest"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {stat.label}
                  </span>
                  <div
                    className="flex items-center justify-center size-7 rounded-lg"
                    style={{
                      backgroundColor: stat.highlight
                        ? 'rgba(74,222,128,0.08)'
                        : 'var(--bg-tertiary)',
                    }}
                  >
                    <Icon
                      className="size-3.5"
                      style={{
                        color: stat.highlight
                          ? 'var(--success)'
                          : 'var(--text-tertiary)',
                      }}
                    />
                  </div>
                </div>
                <span
                  className="text-2xl font-semibold tracking-tight tabular-nums"
                  style={{
                    color: stat.highlight
                      ? 'var(--success)'
                      : 'var(--text-primary)',
                  }}
                >
                  {stat.value}
                </span>
                <p
                  className="text-xs mt-1"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {stat.subtext}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Active Users */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(192,192,192,0.08) 30%, rgba(192,192,192,0.08) 70%, transparent 100%)',
          }}
        />
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <Zap className="size-4" style={{ color: 'var(--success)' }} />
            <h2
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Active Pingers
            </h2>
          </div>
          <span
            className="text-xs tabular-nums"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {activeUsers?.length ?? 0} users
          </span>
        </div>
        {!activeUsers || activeUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <p
              className="text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              No active pingers
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {activeUsers.map((user) => {
              const profile = user.profiles as unknown as {
                discord_username: string
                discord_avatar: string | null
              }
              return (
                <div
                  key={user.user_id}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-200"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div
                    className="flex items-center justify-center size-7 rounded-full text-xs font-semibold flex-shrink-0"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
                      color: 'var(--bg-root)',
                    }}
                  >
                    {profile.discord_username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {profile.discord_username}
                  </span>
                  <Badge
                    variant="default"
                    className="ml-auto text-xs"
                  >
                    <span
                      className="inline-block size-1.5 rounded-full mr-1"
                      style={{ backgroundColor: 'var(--success)' }}
                    />
                    Active
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* System Activity Feed */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(192,192,192,0.08) 30%, rgba(192,192,192,0.08) 70%, transparent 100%)',
          }}
        />
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <Inbox className="size-4" style={{ color: 'var(--text-tertiary)' }} />
            <h2
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              System Activity
            </h2>
          </div>
          <span
            className="text-xs tabular-nums"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Last {(recentLogs as NotificationLog[])?.length ?? 0} entries
          </span>
        </div>
        {!recentLogs || recentLogs.length === 0 ? (
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
              No activity yet
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
                  User
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
                  Time
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(recentLogs as NotificationLog[]).map((log) => (
                <TableRow
                  key={log.id}
                  className="border-b transition-colors duration-200"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <TableCell>
                    <span
                      className="text-xs font-mono tabular-nums"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      ...{log.user_id.slice(-4)}
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
                    <span
                      className="text-xs tabular-nums"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {timeAgo(log.created_at)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
