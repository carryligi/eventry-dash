import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UserSearch } from '@/components/admin/user-search'
import { Shield, Zap, Bell, ShoppingCart } from 'lucide-react'

interface UserRow {
  id: string
  discord_username: string
  discord_avatar: string | null
  is_admin: boolean
  created_at: string
  keyword_count: number
  pinger_active: boolean
  pushover_configured: boolean
  silently_configured: boolean
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const query = params.q ?? ''
  const supabase = await createServerClient()

  // Fetch all profiles
  let profilesQuery = supabase
    .from('profiles')
    .select('id, discord_username, discord_avatar, is_admin, created_at')
    .order('created_at', { ascending: false })

  if (query) {
    profilesQuery = profilesQuery.ilike('discord_username', `%${query}%`)
  }

  const { data: profiles } = await profilesQuery

  if (!profiles || profiles.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <UserSearch initialQuery={query} />
        </div>
        <div
          className="glass-card flex flex-col items-center justify-center py-16"
        >
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            No users found
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {query ? 'Try a different search term' : 'No users have registered yet'}
          </p>
        </div>
      </div>
    )
  }

  // Fetch related data for all users in parallel
  const userIds = profiles.map((p) => p.id)

  const [
    { data: allKeywords },
    { data: pingerData },
    { data: pushoverData },
    { data: silentlyData },
  ] = await Promise.all([
    supabase
      .from('keywords')
      .select('user_id')
      .in('user_id', userIds),
    supabase
      .from('pinger_settings')
      .select('user_id, is_active')
      .in('user_id', userIds),
    supabase
      .from('pushover_settings')
      .select('user_id')
      .in('user_id', userIds),
    supabase
      .from('silently_settings')
      .select('user_id')
      .in('user_id', userIds),
  ])

  // Build lookup maps
  const kwCountMap = new Map<string, number>()
  if (allKeywords) {
    for (const kw of allKeywords) {
      kwCountMap.set(kw.user_id, (kwCountMap.get(kw.user_id) ?? 0) + 1)
    }
  }

  const pingerMap = new Map<string, boolean>()
  if (pingerData) {
    for (const row of pingerData) {
      pingerMap.set(row.user_id, row.is_active)
    }
  }

  const pushoverSet = new Set<string>()
  if (pushoverData) {
    for (const row of pushoverData) {
      pushoverSet.add(row.user_id)
    }
  }

  const silentlySet = new Set<string>()
  if (silentlyData) {
    for (const row of silentlyData) {
      silentlySet.add(row.user_id)
    }
  }

  const users: UserRow[] = profiles.map((p) => ({
    id: p.id,
    discord_username: p.discord_username,
    discord_avatar: p.discord_avatar,
    is_admin: p.is_admin,
    created_at: p.created_at,
    keyword_count: kwCountMap.get(p.id) ?? 0,
    pinger_active: pingerMap.get(p.id) ?? false,
    pushover_configured: pushoverSet.has(p.id),
    silently_configured: silentlySet.has(p.id),
  }))

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="w-72">
          <UserSearch initialQuery={query} />
        </div>
        <span
          className="text-xs tabular-nums"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {users.length} user{users.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div
        className="glass-card overflow-hidden"
      >
        <div
          className="absolute top-0 left-0 right-0 h-px"
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
              <TableHead
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                User
              </TableHead>
              <TableHead
                className="text-xs font-medium uppercase tracking-wider text-center"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Keywords
              </TableHead>
              <TableHead
                className="text-xs font-medium uppercase tracking-wider text-center"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Services
              </TableHead>
              <TableHead
                className="text-xs font-medium uppercase tracking-wider text-right"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Joined
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                className="border-b transition-colors duration-200 cursor-pointer glass-table-row"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <TableCell>
                  <Link
                    href={`/dashboard/admin/users/${user.id}`}
                    className="flex items-center gap-3 group"
                  >
                    <div
                      className="flex items-center justify-center size-8 rounded-full text-xs font-semibold flex-shrink-0 ring-1 ring-[var(--border-default)]"
                      style={{
                        background:
                          'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
                        color: 'var(--bg-root)',
                      }}
                    >
                      {user.discord_username?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-sm font-medium truncate group-hover:underline"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {user.discord_username}
                        </span>
                        {user.is_admin && (
                          <Shield
                            className="size-3 flex-shrink-0"
                            style={{ color: 'var(--text-accent)' }}
                          />
                        )}
                      </div>
                      <span
                        className="text-xs font-mono"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        ...{user.id.slice(-6)}
                      </span>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className="text-sm tabular-nums font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {user.keyword_count}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1.5">
                    <div
                      className="flex items-center justify-center size-6 rounded-md"
                      title={
                        user.pinger_active ? 'Pinger active' : 'Pinger off'
                      }
                      style={{
                        backgroundColor: user.pinger_active
                          ? 'rgba(74,222,128,0.08)'
                          : 'var(--bg-tertiary)',
                      }}
                    >
                      <Zap
                        className="size-3"
                        style={{
                          color: user.pinger_active
                            ? 'var(--success)'
                            : 'var(--text-tertiary)',
                        }}
                      />
                    </div>
                    <div
                      className="flex items-center justify-center size-6 rounded-md"
                      title={
                        user.pushover_configured
                          ? 'Pushover configured'
                          : 'Pushover not set'
                      }
                      style={{
                        backgroundColor: user.pushover_configured
                          ? 'rgba(74,222,128,0.08)'
                          : 'var(--bg-tertiary)',
                      }}
                    >
                      <Bell
                        className="size-3"
                        style={{
                          color: user.pushover_configured
                            ? 'var(--success)'
                            : 'var(--text-tertiary)',
                        }}
                      />
                    </div>
                    <div
                      className="flex items-center justify-center size-6 rounded-md"
                      title={
                        user.silently_configured
                          ? 'Silently configured'
                          : 'Silently not set'
                      }
                      style={{
                        backgroundColor: user.silently_configured
                          ? 'rgba(74,222,128,0.08)'
                          : 'var(--bg-tertiary)',
                      }}
                    >
                      <ShoppingCart
                        className="size-3"
                        style={{
                          color: user.silently_configured
                            ? 'var(--success)'
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
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
