'use client'

import { useState, useCallback, useTransition } from 'react'
import { toast } from 'sonner'
import type { ActionResult } from '@/types'

interface UseActionOptions<TOutput> {
  successMessage?: string
  onSuccess?: (data: TOutput) => void
  onError?: (error: string) => void
}

export function useAction<TInput, TOutput = void>(
  action: (input: TInput) => Promise<ActionResult<TOutput>>,
  options?: UseActionOptions<TOutput>,
) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(
    (input: TInput) => {
      setError(null)
      startTransition(async () => {
        try {
          const result = await action(input)
          if (result.success) {
            if (options?.successMessage) {
              toast.success(options.successMessage)
            }
            options?.onSuccess?.(result.data)
          } else {
            setError(result.error)
            toast.error(result.error)
            options?.onError?.(result.error)
          }
        } catch {
          const msg = 'An unexpected error occurred'
          setError(msg)
          toast.error(msg)
          options?.onError?.(msg)
        }
      })
    },
    [action, options],
  )

  return { execute, isPending, error }
}

// Convenience wrapper for actions without input
export function useActionNoInput<TOutput = void>(
  action: () => Promise<ActionResult<TOutput>>,
  options?: UseActionOptions<TOutput>,
) {
  const { execute, ...rest } = useAction<void, TOutput>(
    () => action(),
    options,
  )
  return { execute: () => execute(undefined as void), ...rest }
}
