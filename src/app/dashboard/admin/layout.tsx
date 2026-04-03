import { requireAdmin } from '@/lib/auth'
import { TopBar } from '@/components/dashboard/top-bar'
import { AdminNav } from '@/components/admin/admin-nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return (
    <>
      <TopBar title="Admin Panel" />
      <AdminNav />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </>
  )
}
