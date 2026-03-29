import { createServerClient } from '@/lib/supabase/server'
import { getUserId } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AdminToggleButton } from '@/components/admin/admin-toggle-button'
import {
  ArrowLeft,
  Shield,
  Zap,
  Bell,
  ShoppingCart,
  Tag,
  Clock,
  MessageSquare,
  Calendar,
} from 'lucide-react'
import type {
  Profile,
  Keyword,
  PingerSettings,
  PushoverSettings,
  SilentlySettings,
  NotificationLog,
  AutostartDisabledKeyword,
} from '@/types'

function maskKey(key: string): string {
  if (key.length <= 6) return '******'
  return key.slice(0, 3) + '***' + key.slice(-3)
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

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: userId } = await params
  const currentAdminId = await getUserId()
  const supabase = await createServerClient()

  // Parallel data fetching
  const [
    { data: profile },
    { data: keywords },
    { data: pingerSettings },
    { data: pushoverSettings },
    { data: silentlySettings },
    { data: disabledKeywords },
    { data: recentLogs },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single(),
    supabase
      .from('keywords')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('pinger_settings')
      .select('*')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('pushover_settings')
      .select('*')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('silently_settings')
      .select('*')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('autostart_disabled_keywords')
      .select('*')
      .eq('user_id', userId),
    supabase
      .from('notification_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!profile) notFound()

  const typedProfile = profile as Profile
  const typedKeywords = (keywords ?? []) as Keyword[]
  const typedPinger = pingerSettings as PingerSettings | null
  const typedPushover = pushoverSettings as PushoverSettings | null
  const typedSilently = silentlySettings as SilentlySettings | null
  const typedDisabled = (disabledKeywords ?? []) as AutostartDisabledKeyword[]
  const typedLogs = (recentLogs ?? []) as NotificationLog[]

  const isSelf = currentAdminId === userId

  return (
    <div className="p-6 space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/admin/users"
        className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-200"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <ArrowLeft className="size-4" />
        Back to Users
      </Link>

      {/* User Header Card */}
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
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="flex items-center justify-center size-12 rounded-full text-base font-semibold ring-1 ring-[var(--border-default)]"
                style={{
                  background:
                    'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
                  color: 'var(--bg-root)',
                }}
              >
                {typedProfile.discord_username?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {typedProfile.discord_username}
                  </h2>
                  {typedProfile.is_admin && (
                    <Badge variant="default" className="gap-1 text-xs">
                      <Shield className="size-3" />
                      Admin
                    </Badge>
                  )}
                </div>
                <p
                  className="text-xs font-mono mt-0.5"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  ID: {typedProfile.id}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Joined{' '}
                  {new Date(typedProfile.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <AdminToggleButton
              userId={userId}
              isAdmin={typedProfile.is_admin}
              isSelf={isSelf}
            />
          </div>
        </div>
      </div>

      {/* Grid: Pinger + Pushover + Silently */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pinger Settings */}
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
              background: typedPinger?.is_active
                ? 'linear-gradient(90deg, transparent 0%, var(--success) 30%, var(--success) 70%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(192,192,192,0.08) 30%, rgba(192,192,192,0.08) 70%, transparent 100%)',
            }}
          />
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <Zap
              className="size-4"
              style={{
                color: typedPinger?.is_active
                  ? 'var(--success)'
                  : 'var(--text-tertiary)',
              }}
            />
            <h3
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Pinger
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span
                className="text-xs uppercase tracking-widest"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Status
              </span>
              <Badge variant={typedPinger?.is_active ? 'default' : 'secondary'}>
                {typedPinger?.is_active ? 'Active' : 'Off'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span
                className="text-xs uppercase tracking-widest"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Cooldown
              </span>
              <span
                className="text-sm tabular-nums"
                style={{ color: 'var(--text-primary)' }}
              >
                {typedPinger?.cooldown_minutes ?? 0} min
              </span>
            </div>
          </div>
        </div>

        {/* Pushover Settings */}
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
              background: typedPushover
                ? 'linear-gradient(90deg, transparent 0%, var(--success) 30%, var(--success) 70%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(192,192,192,0.08) 30%, rgba(192,192,192,0.08) 70%, transparent 100%)',
            }}
          />
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <Bell
              className="size-4"
              style={{
                color: typedPushover
                  ? 'var(--success)'
                  : 'var(--text-tertiary)',
              }}
            />
            <h3
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Pushover
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {typedPushover ? (
              <>
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs uppercase tracking-widest"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    User Key
                  </span>
                  <span
                    className="text-sm font-mono"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {maskKey(typedPushover.user_key)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs uppercase tracking-widest"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Priority
                  </span>
                  <span
                    className="text-sm tabular-nums"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {typedPushover.priority}
                  </span>
                </div>
              </>
            ) : (
              <p
                className="text-sm text-center py-2"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Not configured
              </p>
            )}
          </div>
        </div>

        {/* Silently / Autostart Settings */}
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
              background: typedSilently?.is_active
                ? 'linear-gradient(90deg, transparent 0%, var(--success) 30%, var(--success) 70%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(192,192,192,0.08) 30%, rgba(192,192,192,0.08) 70%, transparent 100%)',
            }}
          />
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <ShoppingCart
              className="size-4"
              style={{
                color: typedSilently?.is_active
                  ? 'var(--success)'
                  : 'var(--text-tertiary)',
              }}
            />
            <h3
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Silently / Autostart
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {typedSilently ? (
              <>
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs uppercase tracking-widest"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Status
                  </span>
                  <Badge
                    variant={typedSilently.is_active ? 'default' : 'secondary'}
                  >
                    {typedSilently.is_active ? 'Active' : 'Off'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs uppercase tracking-widest"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Key
                  </span>
                  <span
                    className="text-sm font-mono"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {maskKey(typedSilently.user_key)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs uppercase tracking-widest"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Min Stock
                  </span>
                  <span
                    className="text-sm tabular-nums"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {typedSilently.min_stock}
                  </span>
                </div>
                {typedSilently.schedule_start && typedSilently.schedule_end && (
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs uppercase tracking-widest"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Schedule
                    </span>
                    <span
                      className="text-sm tabular-nums"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {typedSilently.schedule_start.slice(0, 5)} -{' '}
                      {typedSilently.schedule_end.slice(0, 5)}
                    </span>
                  </div>
                )}
                {typedDisabled.length > 0 && (
                  <div>
                    <span
                      className="text-xs uppercase tracking-widest block mb-1.5"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Disabled Keywords
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {typedDisabled.map((dk) => (
                        <Badge key={dk.id} variant="secondary" className="text-xs">
                          {dk.keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p
                className="text-sm text-center py-2"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Not configured
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Keywords Table */}
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
            <Tag className="size-4" style={{ color: 'var(--text-tertiary)' }} />
            <h3
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Keywords
            </h3>
          </div>
          <span
            className="text-xs tabular-nums"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {typedKeywords.length} keyword{typedKeywords.length !== 1 ? 's' : ''}
          </span>
        </div>
        {typedKeywords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p
              className="text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              No keywords
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
                  Keyword
                </TableHead>
                <TableHead
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Internal Name
                </TableHead>
                <TableHead
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Restriction
                </TableHead>
                <TableHead
                  className="text-xs font-medium uppercase tracking-wider text-right"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Max Price
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typedKeywords.map((kw) => (
                <TableRow
                  key={kw.id}
                  className="border-b"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-1.5 text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <span
                        className="size-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: 'var(--text-accent)' }}
                      />
                      {kw.keyword}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className="text-sm"
                      style={{
                        color: kw.internal_name
                          ? 'var(--text-secondary)'
                          : 'var(--text-tertiary)',
                      }}
                    >
                      {kw.internal_name ?? '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {kw.restriction_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className="text-sm tabular-nums"
                      style={{
                        color: kw.max_price
                          ? 'var(--text-primary)'
                          : 'var(--text-tertiary)',
                      }}
                    >
                      {kw.max_price != null ? `${kw.max_price}` : '-'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Recent Notifications */}
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
            <Clock className="size-4" style={{ color: 'var(--text-tertiary)' }} />
            <h3
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Recent Notifications
            </h3>
          </div>
          <span
            className="text-xs tabular-nums"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Last {typedLogs.length}
          </span>
        </div>
        {typedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p
              className="text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              No notifications
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
              {typedLogs.map((log) => (
                <TableRow
                  key={log.id}
                  className="border-b"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
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
                        title={
                          log.pushover_sent ? 'Push sent' : 'Push not sent'
                        }
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
