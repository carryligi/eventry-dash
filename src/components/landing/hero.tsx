'use client'

import { ArrowRight, LogIn } from 'lucide-react'
import { loginWithWhop } from '@/lib/auth-client'
import { Logo } from '@/components/shared/logo'

export function Hero() {
  return (
    <section className="relative flex min-h-svh items-center justify-center overflow-hidden px-6">
      {/* Subtle radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 45%, color-mix(in oklab, var(--accent-start) 12%, transparent), transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo */}
        <Logo size={88} className="mb-9 drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]" />

        {/* Wordmark */}
        <h1
          className="text-5xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl md:text-7xl"
          style={{ color: 'var(--text-primary)' }}
        >
          Eventry{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
            }}
          >
            Keywords
          </span>
        </h1>

        {/* Login with Whop */}
        <button
          type="button"
          onClick={loginWithWhop}
          className="group mt-12 flex h-11 items-center gap-2.5 rounded-full px-7 text-sm font-medium transition-opacity duration-200 hover:opacity-88"
          style={{
            background:
              'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
            color: '#000000',
          }}
        >
          <LogIn className="h-4 w-4 opacity-75" />
          Login with Whop
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </section>
  )
}
