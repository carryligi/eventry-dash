'use client'

import { useEffect, useState } from 'react'
import { Logo } from '@/components/shared/logo'
import { DiscordIcon } from '@/components/shared/discord-icon'
import { loginWithDiscord } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300',
        scrolled
          ? 'border-b backdrop-blur-md'
          : 'bg-transparent'
      )}
      style={{
        backgroundColor: scrolled ? 'rgba(6, 6, 10, 0.8)' : 'transparent',
        borderColor: scrolled ? 'var(--border-subtle)' : 'transparent',
      }}
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={28} />
          <span
            className="text-[15px] font-semibold tracking-[-0.01em]"
            style={{ color: 'var(--text-primary)' }}
          >
            Eventry
          </span>
        </Link>

        <button
          onClick={loginWithDiscord}
          className="flex h-8 items-center gap-2 rounded-md border px-3 text-[13px] font-medium transition-colors"
          style={{
            borderColor: 'var(--border-default)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <DiscordIcon />
          Login with Discord
        </button>
      </div>
    </header>
  )
}
