'use client'

import { useOptimistic, useTransition } from 'react'
import { Zap, Timer, Package, Clock } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { togglePinger } from '@/lib/actions/pinger'
import { toggleAutostart } from '@/lib/actions/silently'
import type { PingerSettings, SilentlySettings } from '@/types'

interface QuickSettingsProps {
  pingerSettings: PingerSettings | null
  silentlySettings: SilentlySettings | null
}

function formatTime(time: string | null): string {
  if (!time) return '--:--'
  return time.slice(0, 5)
}

export function QuickSettings({
  pingerSettings,
  silentlySettings,
}: QuickSettingsProps) {
  const [pingerPending, startPingerTransition] = useTransition()
  const [silentlyPending, startSilentlyTransition] = useTransition()

  const [optimisticPinger, setOptimisticPinger] = useOptimistic(
    pingerSettings?.is_active ?? false,
    (_current: boolean, next: boolean) => next
  )

  const [optimisticSilently, setOptimisticSilently] = useOptimistic(
    silentlySettings?.is_active ?? false,
    (_current: boolean, next: boolean) => next
  )

  const handlePingerToggle = (checked: boolean) => {
    startPingerTransition(async () => {
      setOptimisticPinger(checked)
      await togglePinger(checked)
    })
  }

  const handleSilentlyToggle = (checked: boolean) => {
    if (!silentlySettings) return
    startSilentlyTransition(async () => {
      setOptimisticSilently(checked)
      await toggleAutostart(checked)
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Pinger Quick Card */}
      <div className="glass-card group relative overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center size-8 rounded-lg transition-colors duration-300"
                style={{
                  backgroundColor: optimisticPinger ? 'rgba(48,209,88,0.08)' : 'var(--bg-tertiary)',
                }}
              >
                <Zap
                  className="size-4 transition-colors duration-300"
                  style={{ color: optimisticPinger ? 'var(--success)' : 'var(--text-tertiary)' }}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Pinger
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Event notifications
                </p>
              </div>
            </div>

            <Switch
              checked={optimisticPinger}
              onCheckedChange={handlePingerToggle}
              disabled={pingerPending}
            />
          </div>

          <div
            className="flex items-center gap-4 pt-3"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-1.5">
              <Timer className="size-3" style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                {pingerSettings?.cooldown_minutes ?? 0}m cooldown
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Silently / Autostart Quick Card */}
      <div
        className="glass-card group relative overflow-hidden"
        style={{ opacity: silentlySettings ? 1 : 0.5 }}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center size-8 rounded-lg transition-colors duration-300"
                style={{
                  backgroundColor: optimisticSilently ? 'rgba(48,209,88,0.08)' : 'var(--bg-tertiary)',
                }}
              >
                <Package
                  className="size-4 transition-colors duration-300"
                  style={{ color: optimisticSilently ? 'var(--success)' : 'var(--text-tertiary)' }}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Autostart
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {silentlySettings ? 'Silently integration' : 'No API key configured'}
                </p>
              </div>
            </div>

            <Switch
              checked={optimisticSilently}
              onCheckedChange={handleSilentlyToggle}
              disabled={!silentlySettings || silentlyPending}
            />
          </div>

          <div
            className="flex items-center gap-4 pt-3"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-1.5">
              <Package className="size-3" style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                Min stock: {silentlySettings?.min_stock ?? 0}
              </span>
            </div>

            {silentlySettings?.schedule_start && (
              <div className="flex items-center gap-1.5">
                <Clock className="size-3" style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {formatTime(silentlySettings.schedule_start)}
                  {' - '}
                  {formatTime(silentlySettings.schedule_end)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
