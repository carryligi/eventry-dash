'use client'

import { ArrowRight } from 'lucide-react'
import { Reveal } from '@/components/shared/reveal'
import { DiscordIcon } from '@/components/shared/discord-icon'
import { loginWithDiscord } from '@/lib/auth-client'

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
        <Reveal>
          <div className="glass-card relative overflow-hidden rounded-lg p-10 sm:p-14">
            {/* Subtle accent glow at top edge */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              aria-hidden="true"
              style={{
                background: 'linear-gradient(90deg, transparent 10%, var(--accent-start) 50%, transparent 90%)',
                opacity: 0.4,
              }}
            />

            <div className="relative z-10 flex flex-col items-center text-center">
              <h2
                className="max-w-md text-2xl font-bold tracking-[-0.02em] sm:text-3xl"
                style={{ color: 'var(--text-primary)' }}
              >
                Start monitoring in under a minute
              </h2>
              <p
                className="mt-3 max-w-sm text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                Connect your Discord account, set your first keyword, and let Eventry handle the rest.
              </p>
              <button
                onClick={loginWithDiscord}
                className="group mt-8 flex h-10 items-center gap-2.5 rounded-lg px-5 text-sm font-semibold transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
                  color: 'var(--bg-root)',
                }}
              >
                <DiscordIcon className="opacity-70" />
                Get Started Free
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
