'use client'

import { Logo } from '@/components/shared/logo'
import { DiscordIcon } from '@/components/shared/discord-icon'
import { loginWithDiscord } from '@/lib/auth-client'
import Link from 'next/link'

export function Navbar() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 border-b backdrop-blur-md"
      style={{
        backgroundColor: 'rgba(6, 6, 10, 0.8)',
        borderColor: 'var(--border-subtle)',
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
          className="glass-button flex h-8 items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors"
          style={{
            color: 'var(--text-secondary)',
          }}
        >
          <DiscordIcon />
          Login with Discord
        </button>
      </div>
    </header>
  )
}
