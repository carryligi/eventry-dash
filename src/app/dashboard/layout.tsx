import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Skeleton } from '@/components/ui/skeleton'

async function SidebarWithData() {
  const profile = await getCurrentUser()
  return <Sidebar profile={profile} />
}

function SidebarSkeleton() {
  return (
    <aside className="flex h-screen w-14 flex-col items-center border-r py-4 gap-2"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
      <Skeleton className="h-7 w-7 rounded-full" />
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-md" />
        ))}
      </div>
    </aside>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarWithData />
      </Suspense>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
