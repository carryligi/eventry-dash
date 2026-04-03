'use client'

import { ArrowRight } from 'lucide-react'
import { DiscordIcon } from '@/components/shared/discord-icon'
import { loginWithDiscord } from '@/lib/auth-client'

export function Hero() {
  return (
    <section className="relative flex min-h-svh items-center justify-center overflow-hidden">
      {/* Hero content */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        {/* Intro pill */}
        <div
          className="glass-panel mb-8 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5"
          style={{
            color: 'var(--text-tertiary)',
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
          <span className="text-xs font-medium tracking-wide uppercase">
            Discord keyword monitoring
          </span>
        </div>

        {/* Headline */}
        <h1
          className="text-4xl font-bold leading-[1.1] tracking-[-0.025em] sm:text-5xl md:text-6xl"
          style={{ color: 'var(--text-primary)' }}
        >
          Monitor. Alert.{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
            }}
          >
            Autostart.
          </span>
        </h1>

        {/* Subheading */}
        <p
          className="mx-auto mt-5 max-w-lg text-base leading-relaxed sm:text-lg"
          style={{ color: 'var(--text-secondary)' }}
        >
          Track keywords across Discord servers. Get instant push notifications. Automatically start tasks when it matters.
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {/* Primary CTA */}
          <button
            onClick={loginWithDiscord}
            className="group flex h-10 items-center gap-2.5 rounded-lg px-5 text-sm font-semibold transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
              color: 'var(--bg-root)',
            }}
          >
            <DiscordIcon className="opacity-70" />
            Get Started
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>

          {/* Secondary CTA */}
          <a
            href="#features"
            className="glass-button flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors"
            style={{
              color: 'var(--text-secondary)',
            }}
          >
            See how it works
          </a>
        </div>
      </div>

      {/* Bottom fade to next section */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        aria-hidden="true"
        style={{
          background: 'linear-gradient(to bottom, transparent, var(--bg-root))',
        }}
      />
    </section>
  )
}
