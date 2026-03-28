import { getCurrentUser } from '@/lib/auth'
import { Sidebar } from '@/components/dashboard/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentUser()

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-root)' }}>
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto pb-14 md:pb-0">{children}</main>
    </div>
  )
}
