'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Users,
  Crown,
  Wrench,
  Upload,
  Webhook,
} from 'lucide-react'
import { ADMIN_NAV_ITEMS } from '@/lib/constants'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  Users,
  Crown,
  Wrench,
  Upload,
  Webhook,
}

export function AdminNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard/admin') return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div
      className="flex items-center gap-1 px-6 py-2 overflow-x-auto scrollbar-none"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      {ADMIN_NAV_ITEMS.map((item) => {
        const Icon = iconMap[item.icon]
        const active = isActive(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200"
            style={{
              backgroundColor: active ? 'var(--bg-active)' : 'transparent',
              color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            {Icon && <Icon className="size-3.5" />}
            {item.label}
            {active && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[9px] h-[2px] w-6 rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, var(--accent-start), var(--accent-end))',
                }}
              />
            )}
          </Link>
        )
      })}
    </div>
  )
}
