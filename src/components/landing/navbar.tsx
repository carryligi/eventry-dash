'use client'

import { Logo } from '@/components/shared/logo'
import { loginWithWhop } from '@/lib/auth-client'
import { LogIn } from 'lucide-react'
import Link from 'next/link'

export function Navbar() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 border-b"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
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
          onClick={loginWithWhop}
          className="glass-button flex h-8 items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors"
          style={{
            color: 'var(--text-secondary)',
          }}
        >
          <LogIn className="size-3.5" />
          Login
        </button>
      </div>
    </header>
  )
}
