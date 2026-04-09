'use client'

import { useRouter } from 'next/navigation'
import { Loader2, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useActionNoInput } from '@/hooks/use-action'
import { markOnboarded } from '@/lib/actions/eventry-import'

export function SkipOnboardingButton() {
  const router = useRouter()
  const skipAction = useActionNoInput(markOnboarded, {
    onSuccess: () => {
      router.push('/dashboard')
      router.refresh()
    },
  })

  return (
    <Button
      variant="ghost"
      onClick={() => skipAction.execute()}
      disabled={skipAction.isPending}
    >
      {skipAction.isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <SkipForward className="size-3.5" />
      )}
      Start without import
    </Button>
  )
}
