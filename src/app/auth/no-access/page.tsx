import Link from 'next/link'
import { ShieldX } from 'lucide-react'

export default function NoAccessPage() {
  return (
    <div
      className="flex min-h-svh items-center justify-center px-6"
      style={{ backgroundColor: 'var(--bg-root)' }}
    >
      <div className="glass-card max-w-md w-full p-8 text-center">
        <div
          className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: 'rgba(248,113,113,0.1)' }}
        >
          <ShieldX className="size-6" style={{ color: 'var(--error)' }} />
        </div>
        <h1
          className="text-xl font-semibold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          No Access
        </h1>
        <p
          className="text-sm leading-relaxed mb-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          You need an active membership to access the Eventry dashboard.
          Purchase a membership to get started.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="https://whop.com"
            className="inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
              color: 'var(--bg-root)',
            }}
          >
            Get Membership
          </a>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium glass-button"
            style={{ color: 'var(--text-secondary)' }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
