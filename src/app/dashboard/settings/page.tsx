import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/dashboard/top-bar'
import { SettingsForm } from '@/components/dashboard/settings-form'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Image from 'next/image'
import { User } from 'lucide-react'

export default async function SettingsPage() {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()

  const { data: pingerSettings } = await supabase
    .from('pinger_settings')
    .select('*')
    .eq('user_id', profile.id)
    .maybeSingle()

  const avatarUrl = profile.avatar_url ?? null

  const joinedDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      <TopBar title="Settings" />
      <div className="p-6 space-y-8 max-w-2xl">
        {/* User Info Section */}
        <Card
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-default)',
          }}
        >
          <CardHeader>
            <CardTitle
              className="flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <User className="size-4" style={{ color: 'var(--text-accent)' }} />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div
                className="relative size-16 shrink-0 rounded-full overflow-hidden border-2"
                style={{
                  borderColor: 'var(--border-strong)',
                  backgroundColor: 'var(--bg-tertiary)',
                }}
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="User avatar"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center size-full">
                    <User
                      className="size-8"
                      style={{ color: 'var(--text-tertiary)' }}
                    />
                  </div>
                )}
              </div>

              {/* User details */}
              <div className="space-y-1 min-w-0">
                <p
                  className="text-base font-semibold truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {profile.username || profile.discord_username || 'User'}
                </p>
                <p
                  className="text-xs font-mono truncate"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {profile.id}
                </p>
              </div>
            </div>

            <Separator
              className="my-4"
              style={{ backgroundColor: 'var(--border-subtle)' }}
            />

            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: 'var(--text-tertiary)' }}>Joined</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {joinedDate}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Interactive sections (cooldown + danger zone) */}
        <SettingsForm
          cooldownMinutes={pingerSettings?.cooldown_minutes ?? 0}
          pingerActive={pingerSettings?.is_active ?? false}
        />
      </div>
    </>
  )
}
