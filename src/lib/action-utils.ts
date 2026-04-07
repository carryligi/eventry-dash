/**
 * Check if an error is a Next.js redirect error (thrown by redirect()).
 * These must be re-thrown, never caught.
 */
export function isRedirectError(err: unknown): boolean {
  return err instanceof Error && err.message === 'NEXT_REDIRECT'
}

/**
 * Re-throws redirect errors, returns error message for everything else.
 */
export function handleActionError(err: unknown, fallback: string): string {
  if (isRedirectError(err)) throw err
  console.error(fallback, err)
  return err instanceof Error ? err.message : fallback
}
