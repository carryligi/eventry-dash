import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/dashboard/top-bar'
import { AdminNav } from '@/components/admin/admin-nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.user_metadata.provider_id)
    .single()

  if (!data?.is_admin) redirect('/dashboard')

  return (
    <>
      <TopBar title="Admin Panel" />
      <AdminNav />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </>
  )
}
