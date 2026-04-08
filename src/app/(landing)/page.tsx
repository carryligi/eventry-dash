import { getOptionalUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Hero } from '@/components/landing/hero'

export default async function LandingPage() {
  const user = await getOptionalUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-svh bg-ev-root">
      <Hero />
    </main>
  )
}
