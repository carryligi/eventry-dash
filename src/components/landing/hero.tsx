'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { DiscordIcon } from '@/components/shared/discord-icon'
import { loginWithDiscord } from '@/lib/auth-client'

export function Hero() {
  return (
    <section className="relative flex min-h-svh items-center justify-center overflow-hidden">
      {/* Animated background logo */}
      <motion.div
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 0.3 }}
      >
        <motion.div
          animate={{
            y: [0, -12, 0],
            rotate: [0, 1.5, 0, -1.5, 0],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Image
            src="/logo.png"
            alt=""
            width={520}
            height={520}
            className="opacity-[0.05]"
            style={{ filter: 'grayscale(100%) brightness(2.5)' }}
            priority
            aria-hidden="true"
          />
        </motion.div>
      </motion.div>

      {/* Subtle top-down vignette for depth (no blob) */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(192,192,192,0.03) 0%, transparent 70%)',
        }}
      />

      {/* Hero content */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        {/* Intro pill */}
        <motion.div
          className="mb-8 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5"
          style={{
            borderColor: 'var(--border-default)',
            color: 'var(--text-tertiary)',
          }}
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
          <span className="text-xs font-medium tracking-wide uppercase">
            Discord keyword monitoring
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-4xl font-bold leading-[1.1] tracking-[-0.025em] sm:text-5xl md:text-6xl"
          style={{ color: 'var(--text-primary)' }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
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
        </motion.h1>

        {/* Subheading */}
        <motion.p
          className="mx-auto mt-5 max-w-lg text-base leading-relaxed sm:text-lg"
          style={{ color: 'var(--text-secondary)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
        >
          Track keywords across Discord servers. Get instant push notifications. Automatically start tasks when it matters.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65, ease: [0.25, 0.4, 0.25, 1] }}
        >
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
            className="flex h-10 items-center gap-2 rounded-lg border px-5 text-sm font-medium transition-colors"
            style={{
              borderColor: 'var(--border-default)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
              e.currentTarget.style.borderColor = 'var(--border-strong)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = 'var(--border-default)'
            }}
          >
            See how it works
          </a>
        </motion.div>
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
