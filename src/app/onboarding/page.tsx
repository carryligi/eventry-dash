import { redirect } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getExistingDataCounts } from '@/lib/import/existing-data'
import { EventryImportForm } from '@/components/dashboard/eventry-import-form'
import { SkipOnboardingButton } from '@/components/dashboard/skip-onboarding-button'

export const metadata = {
  title: 'Welcome · Eventry Dashboard',
}

export default async function OnboardingPage() {
  const profile = await getCurrentUser()

  // If the user is already onboarded, don't show this page.
  // (Accessible via /onboarding manually, but pointless.)
  if (profile.is_onboarded) {
    redirect('/dashboard')
  }

  const counts = await getExistingDataCounts(profile.id)

  return (
    <div className="min-h-screen bg-ev-primary">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16 space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center justify-center size-12 rounded-xl bg-ev-secondary border border-ev-border-default">
            <Sparkles className="size-5 text-ev-text-accent" />
          </div>
          <h1 className="text-2xl font-semibold text-ev-text-primary">
            Welcome to Eventry Dashboard
          </h1>
          <p className="text-sm text-ev-text-secondary max-w-md mx-auto">
            Already used the legacy Eventry tool? Import your settings in
            seconds. You can also skip this step and do it later from Settings.
          </p>
        </div>

        <EventryImportForm
          variant="onboarding"
          existingDataCounts={counts}
          redirectTo="/dashboard"
        />

        <div className="flex items-center justify-center">
          <SkipOnboardingButton />
        </div>
      </div>
    </div>
  )
}
