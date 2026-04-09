import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/dashboard/top-bar'
import { SettingsForm } from '@/components/dashboard/settings-form'
import { EventryImportForm } from '@/components/dashboard/eventry-import-form'
import { getExistingDataCounts } from '@/lib/import/existing-data'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Image from 'next/image'
import { Download, User } from 'lucide-react'

export default async function SettingsPage() {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()

  const { data: pingerSettings } = await supabase
    .from('pinger_settings')
    .select('*')
    .eq('user_id', profile.id)
    .maybeSingle()

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('discord_user_id')
    .eq('id', profile.id)
    .maybeSingle()

  const existingDataCounts = await getExistingDataCounts(profile.id)

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
        <Card className="bg-ev-secondary border-ev-border-default">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-ev-text-primary">
              <User className="size-4 text-ev-text-accent" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative size-16 shrink-0 rounded-full overflow-hidden border-2 border-ev-border-strong bg-ev-tertiary">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="User avatar"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center size-full">
                    <User className="size-8 text-ev-text-tertiary" />
                  </div>
                )}
              </div>

              <div className="space-y-1 min-w-0">
                <p className="text-base font-semibold truncate text-ev-text-primary">
                  {profile.username || 'User'}
                </p>
                <p className="text-xs font-mono truncate text-ev-text-tertiary">
                  {profile.id}
                </p>
              </div>
            </div>

            <Separator className="my-4 bg-ev-border-subtle" />

            <div className="flex items-center gap-2 text-sm">
              <span className="text-ev-text-tertiary">Joined</span>
              <span className="text-ev-text-secondary">{joinedDate}</span>
            </div>
          </CardContent>
        </Card>

        {/* Interactive sections (discord id + cooldown + danger zone) */}
        <SettingsForm
          cooldownMinutes={pingerSettings?.cooldown_minutes ?? 0}
          pingerActive={pingerSettings?.is_active ?? false}
          discordUserId={profileRow?.discord_user_id ?? null}
        />

        {/* Eventry Import Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Download className="size-4 text-ev-text-accent" />
            <h2 className="text-sm font-semibold text-ev-text-primary">
              Data migration
            </h2>
          </div>
          <EventryImportForm
            variant="settings"
            existingDataCounts={existingDataCounts}
            redirectTo="/dashboard/keywords"
          />
        </div>
      </div>
    </>
  )
}
