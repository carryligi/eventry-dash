import { createServerClient } from '@/lib/supabase/server'
import { Wrench } from 'lucide-react'
import { SettingRow } from '@/components/admin/setting-row'
import type { AppSetting } from '@/types'

export default async function AdminSettingsPage() {
  const supabase = await createServerClient()

  const { data: settings } = await supabase
    .from('app_settings')
    .select('*')
    .order('key')

  const settingsMap = new Map<string, AppSetting>()
  if (settings) {
    for (const s of settings as AppSetting[]) {
      settingsMap.set(s.key, s)
    }
  }

  const settingConfigs = [
    {
      key: 'discord_bot_token',
      label: 'Discord Bot Token',
      masked: true,
      readOnly: false,
    },
    {
      key: 'pushover_app_key',
      label: 'Pushover Application Key',
      masked: true,
      readOnly: false,
    },
    {
      key: 'silently_api_key',
      label: 'Silently API Key',
      masked: true,
      readOnly: false,
    },
    {
      key: 'guild_id',
      label: 'Guild ID',
      masked: false,
      readOnly: true,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="glass-card relative rounded-xl overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent 100%)',
          }}
        />
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <Wrench className="size-4" style={{ color: 'var(--text-tertiary)' }} />
          <h3
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            Application Settings
          </h3>
        </div>

        {settingConfigs.map((config) => {
          const setting = settingsMap.get(config.key)
          return (
            <SettingRow
              key={config.key}
              settingKey={config.key}
              label={config.label}
              value={setting?.value ?? ''}
              masked={config.masked}
              readOnly={config.readOnly}
            />
          )
        })}

        {/* Last updated info */}
        <div className="px-4 py-3">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Settings are used by the Discord bot. Changes take effect on the next
            bot restart or settings reload.
          </p>
        </div>
      </div>
    </div>
  )
}
