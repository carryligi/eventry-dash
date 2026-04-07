import { getOptionalUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { HowItWorks } from '@/components/landing/how-it-works'
import { CTASection } from '@/components/landing/cta-section'
import { Footer } from '@/components/landing/footer'

export default async function LandingPage() {
  const user = await getOptionalUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-svh bg-ev-root">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <CTASection />
      <Footer />
    </div>
  )
}
