'use client'

import { ArrowRight } from 'lucide-react'
import { Reveal } from '@/components/shared/reveal'
import { createClient } from '@/lib/supabase/client'

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="12"
      viewBox="0 0 24 18"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.317 1.492a19.7 19.7 0 0 0-4.885-1.516.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.7 19.7 0 0 0 3.677 1.492a.07.07 0 0 0-.032.027C.533 6.093-.32 10.555.099 14.961a.08.08 0 0 0 .031.055 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10 10 0 0 0 .372-.292.074.074 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.098.246.198.373.293a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.028zM8.02 12.278c-1.183 0-2.157-1.086-2.157-2.419s.955-2.419 2.157-2.419c1.21 0 2.176 1.095 2.157 2.42 0 1.332-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419s.955-2.419 2.157-2.419c1.21 0 2.176 1.095 2.157 2.42 0 1.332-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

export function CTASection() {
  const handleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

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
          <div
            className="relative overflow-hidden rounded-lg border p-10 sm:p-14"
            style={{
              borderColor: 'var(--border-default)',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
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
                onClick={handleLogin}
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
