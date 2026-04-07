'use client'

import { useOptimistic } from 'react'
import { Zap, Timer, Package, Clock } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useAction } from '@/hooks/use-action'
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
  const [optimisticPinger, setOptimisticPinger] = useOptimistic(
    pingerSettings?.is_active ?? false,
    (_current: boolean, next: boolean) => next,
  )

  const [optimisticSilently, setOptimisticSilently] = useOptimistic(
    silentlySettings?.is_active ?? false,
    (_current: boolean, next: boolean) => next,
  )

  const pingerAction = useAction(togglePinger, {
    successMessage: 'Pinger updated',
  })

  const autostartAction = useAction(toggleAutostart, {
    successMessage: 'Autostart updated',
  })

  const handlePingerToggle = (checked: boolean) => {
    setOptimisticPinger(checked)
    pingerAction.execute(checked)
  }

  const handleSilentlyToggle = (checked: boolean) => {
    if (!silentlySettings) return
    setOptimisticSilently(checked)
    autostartAction.execute(checked)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Pinger Quick Card */}
      <div className="glass-card group relative overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center size-8 rounded-lg transition-colors duration-300 ${
                  optimisticPinger ? 'bg-ev-success/8' : 'bg-ev-tertiary'
                }`}
              >
                <Zap
                  className={`size-4 transition-colors duration-300 ${
                    optimisticPinger ? 'text-ev-success' : 'text-ev-text-tertiary'
                  }`}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-ev-text-primary">
                  Pinger
                </h3>
                <p className="text-xs text-ev-text-tertiary">
                  Event notifications
                </p>
              </div>
            </div>

            <Switch
              checked={optimisticPinger}
              onCheckedChange={handlePingerToggle}
              disabled={pingerAction.isPending}
            />
          </div>

          <div className="flex items-center gap-4 pt-3 border-t border-ev-border-subtle">
            <div className="flex items-center gap-1.5">
              <Timer className="size-3 text-ev-text-tertiary" />
              <span className="text-xs tabular-nums text-ev-text-secondary">
                {pingerSettings?.cooldown_minutes ?? 0}m cooldown
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Silently / Autostart Quick Card */}
      <div
        className={`glass-card group relative overflow-hidden ${
          !silentlySettings ? 'opacity-50' : ''
        }`}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center size-8 rounded-lg transition-colors duration-300 ${
                  optimisticSilently ? 'bg-ev-success/8' : 'bg-ev-tertiary'
                }`}
              >
                <Package
                  className={`size-4 transition-colors duration-300 ${
                    optimisticSilently ? 'text-ev-success' : 'text-ev-text-tertiary'
                  }`}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-ev-text-primary">
                  Autostart
                </h3>
                <p className="text-xs text-ev-text-tertiary">
                  {silentlySettings ? 'Silently integration' : 'No API key configured'}
                </p>
              </div>
            </div>

            <Switch
              checked={optimisticSilently}
              onCheckedChange={handleSilentlyToggle}
              disabled={!silentlySettings || autostartAction.isPending}
            />
          </div>

          <div className="flex items-center gap-4 pt-3 border-t border-ev-border-subtle">
            <div className="flex items-center gap-1.5">
              <Package className="size-3 text-ev-text-tertiary" />
              <span className="text-xs tabular-nums text-ev-text-secondary">
                Min stock: {silentlySettings?.min_stock ?? 0}
              </span>
            </div>

            {silentlySettings?.schedule_start && (
              <div className="flex items-center gap-1.5">
                <Clock className="size-3 text-ev-text-tertiary" />
                <span className="text-xs tabular-nums text-ev-text-secondary">
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
