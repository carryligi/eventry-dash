'use client'

import { ArrowRight, LogIn } from 'lucide-react'
import { loginWithWhop } from '@/lib/auth-client'

export function CTASection() {
  return (
    <section className="relative py-24 sm:py-32">
      {/* Divider */}
      <div
        className="absolute left-6 right-6 top-0 mx-auto h-px max-w-6xl"
        style={{ backgroundColor: 'var(--border-subtle)' }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-6">
        <div className="glass-card relative overflow-hidden rounded-lg p-10 sm:p-14">
          <div className="relative z-10 flex flex-col items-center text-center">
            <h2
              className="max-w-md text-2xl font-semibold tracking-[-0.02em] sm:text-3xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Start monitoring in under a minute
            </h2>
            <p
              className="mt-3 max-w-sm text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign in, set your first keyword, and let Eventry handle the rest.
            </p>
            <button
              onClick={loginWithWhop}
              className="group mt-8 flex h-10 items-center gap-2.5 rounded-full px-6 text-sm font-medium transition-opacity duration-200 hover:opacity-88"
              style={{
                background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
                color: 'var(--bg-root)',
              }}
            >
              <LogIn className="h-4 w-4 opacity-70" />
              Get Started Free
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
