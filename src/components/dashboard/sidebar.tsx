'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Tag,
  Zap,
  Bell,
  Settings,
  Shield,
  LogOut,
  MoreHorizontal,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NAV_ITEMS, ROUTES } from '@/lib/constants'
import type { Profile } from '@/types'
import { createClient } from '@/lib/supabase/client'

// Map icon names to components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Tag,
  Zap,
  Bell,
  Settings,
}

function getDiscordAvatarUrl(profile: Profile): string | null {
  if (!profile.discord_avatar) return null
  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.discord_avatar}.png?size=64`
}

function UserAvatar({ profile }: { profile: Profile }) {
  const avatarUrl = getDiscordAvatarUrl(profile)
  const initial = profile.discord_username?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="relative size-8 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-[var(--border-default)] transition-all duration-200 hover:ring-[var(--border-strong)] hover:shadow-[0_0_8px_rgba(192,192,192,0.08)]">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={profile.discord_username}
          width={32}
          height={32}
          className="size-full object-cover"
          unoptimized
        />
      ) : (
        <div
          className="size-full flex items-center justify-center text-xs font-semibold"
          style={{
            background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
            color: 'var(--bg-root)',
          }}
        >
          {initial}
        </div>
      )}
    </div>
  )
}

interface SidebarProps {
  profile: Profile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const isActive = (href: string) => {
    if (href === ROUTES.dashboard) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col items-center w-14 h-screen flex-shrink-0 relative z-20"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        {/* Metallic sheen line on the right edge */}
        <div
          className="absolute right-0 top-0 w-px h-full pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, transparent 0%, rgba(192,192,192,0.06) 20%, rgba(192,192,192,0.03) 80%, transparent 100%)',
          }}
        />

        {/* Logo */}
        <div className="flex items-center justify-center h-14 w-full flex-shrink-0">
          <Link href={ROUTES.dashboard} className="relative group">
            <Image
              src="/logo.png"
              alt="Eventry"
              width={28}
              height={28}
              className="transition-transform duration-300 group-hover:scale-110"
              priority
            />
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ boxShadow: '0 0 12px rgba(192,192,192,0.15)' }}
            />
          </Link>
        </div>

        {/* Divider */}
        <div
          className="w-7 h-px flex-shrink-0"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--border-default), transparent)',
          }}
        />

        {/* Navigation Icons */}
        <nav className="flex flex-col items-center gap-1 mt-3 flex-1">
          <TooltipProvider>
            {NAV_ITEMS.map((item) => {
              const Icon = iconMap[item.icon]
              if (!Icon) return null
              const active = isActive(item.href)

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger
                    render={
                      <Link
                        href={item.href}
                        className="flex items-center justify-center size-9 rounded-lg transition-all duration-200 relative group"
                        style={{
                          backgroundColor: active
                            ? 'var(--bg-active)'
                            : 'transparent',
                          color: active
                            ? 'var(--text-primary)'
                            : 'var(--text-tertiary)',
                        }}
                      />
                    }
                  >
                    {/* Active indicator bar */}
                    {active && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[5px] w-[2px] h-4 rounded-full"
                        style={{
                          background:
                            'linear-gradient(180deg, var(--accent-start), var(--accent-end))',
                        }}
                      />
                    )}
                    <Icon
                      className={`size-[18px] transition-all duration-200 ${
                        active
                          ? ''
                          : 'group-hover:text-[var(--text-secondary)]'
                      }`}
                    />
                    {/* Hover glow */}
                    {!active && (
                      <div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                        style={{
                          backgroundColor: 'var(--bg-hover)',
                        }}
                      />
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </TooltipProvider>
        </nav>

        {/* Bottom Section */}
        <div className="flex flex-col items-center gap-1 pb-3">
          {/* Admin Icon */}
          {profile.is_admin && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      href={ROUTES.admin}
                      className="flex items-center justify-center size-9 rounded-lg transition-all duration-200 relative group"
                      style={{
                        backgroundColor: isActive(ROUTES.admin)
                          ? 'var(--bg-active)'
                          : 'transparent',
                        color: isActive(ROUTES.admin)
                          ? 'var(--text-primary)'
                          : 'var(--text-tertiary)',
                      }}
                    />
                  }
                >
                  {isActive(ROUTES.admin) && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[5px] w-[2px] h-4 rounded-full"
                      style={{
                        background:
                          'linear-gradient(180deg, var(--accent-start), var(--accent-end))',
                      }}
                    />
                  )}
                  <Shield
                    className={`size-[18px] transition-all duration-200 ${
                      isActive(ROUTES.admin)
                        ? ''
                        : 'group-hover:text-[var(--text-secondary)]'
                    }`}
                  />
                  {!isActive(ROUTES.admin) && (
                    <div
                      className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                      style={{ backgroundColor: 'var(--bg-hover)' }}
                    />
                  )}
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Admin
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Divider */}
          <div
            className="w-7 h-px my-1"
            style={{
              background:
                'linear-gradient(90deg, transparent, var(--border-default), transparent)',
            }}
          />

          {/* User Avatar + Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="cursor-pointer outline-none">
              <UserAvatar profile={profile} />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" sideOffset={12} align="end">
              <div className="px-2 py-1.5">
                <p
                  className="text-sm font-medium truncate max-w-[160px]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {profile.discord_username}
                </p>
                {profile.is_admin && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    Admin
                  </p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onSelect={handleLogout}
              >
                <LogOut className="size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-14"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Metallic sheen line on top edge */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(192,192,192,0.06) 30%, rgba(192,192,192,0.06) 70%, transparent 100%)',
          }}
        />

        {NAV_ITEMS.slice(0, 4).map((item) => {
          const Icon = iconMap[item.icon]
          if (!Icon) return null
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center h-full px-3 relative"
              style={{
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {active && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-6 rounded-full"
                  style={{
                    background:
                      'linear-gradient(90deg, var(--accent-start), var(--accent-end))',
                  }}
                />
              )}
              <Icon className="size-5" />
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* More dropdown for remaining items */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex flex-col items-center justify-center h-full px-3 cursor-pointer outline-none">
            <MoreHorizontal
              className="size-5"
              style={{ color: 'var(--text-tertiary)' }}
            />
            <span
              className="text-[10px] mt-0.5 font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              More
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" sideOffset={8} align="end">
            {/* Settings */}
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onSelect={() => router.push(ROUTES.settings)}
            >
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>

            {/* Admin */}
            {profile.is_admin && (
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onSelect={() => router.push(ROUTES.admin)}
              >
                <Shield className="size-4" />
                Admin
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onSelect={handleLogout}
            >
              <LogOut className="size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </>
  )
}
