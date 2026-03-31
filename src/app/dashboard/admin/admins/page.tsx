import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Crown } from 'lucide-react'
import { GrantAdminForm } from '@/components/admin/grant-admin-form'
import { RevokeAdminButton } from '@/components/admin/revoke-admin-button'
import type { Profile } from '@/types'

export default async function AdminManagementPage() {
  const currentAdmin = await requireAdmin()
  const supabase = await createServerClient()

  const { data: admins } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_admin', true)
    .order('created_at', { ascending: true })

  const adminList = (admins ?? []) as Profile[]

  return (
    <div className="p-6 space-y-6">
      {/* Grant Admin Form */}
      <GrantAdminForm />

      {/* Current Admins */}
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
            <Crown className="size-4" style={{ color: 'var(--text-tertiary)' }} />
            <h3
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Current Admins
            </h3>
          </div>
          <span
            className="text-xs tabular-nums"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {adminList.length} admin{adminList.length !== 1 ? 's' : ''}
          </span>
        </div>

        {adminList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p
              className="text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              No admins configured
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
                  User ID
                </TableHead>
                <TableHead
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Since
                </TableHead>
                <TableHead
                  className="text-xs font-medium uppercase tracking-wider text-right"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminList.map((admin) => {
                const isSelf = admin.id === currentAdmin.id

                return (
                  <TableRow
                    key={admin.id}
                    className="border-b"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center size-8 rounded-full text-xs font-semibold flex-shrink-0 ring-1 ring-[var(--border-default)]"
                          style={{
                            background:
                              'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
                            color: 'var(--bg-root)',
                          }}
                        >
                          {admin.discord_username?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-sm font-medium"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {admin.discord_username}
                          </span>
                          {isSelf && (
                            <Badge variant="secondary" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-xs font-mono"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {admin.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-xs tabular-nums"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {new Date(admin.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <RevokeAdminButton userId={admin.id} isSelf={isSelf} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
