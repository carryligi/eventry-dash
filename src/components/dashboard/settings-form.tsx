'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAction, useActionNoInput } from '@/hooks/use-action'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { updateCooldown, togglePinger } from '@/lib/actions/pinger'
import { removeAllKeywords } from '@/lib/actions/keywords'
import { updateDiscordUserId } from '@/lib/actions/profile'
import { Clock, AlertTriangle, Power, Trash2, Loader2, MessageSquare } from 'lucide-react'

interface SettingsFormProps {
  cooldownMinutes: number
  pingerActive: boolean
  discordUserId: string | null
}

export function SettingsForm({ cooldownMinutes, pingerActive, discordUserId }: SettingsFormProps) {
  const [cooldown, setCooldown] = useState(cooldownMinutes)
  const [discordId, setDiscordId] = useState(discordUserId ?? '')
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)

  const cooldownAction = useAction(updateCooldown, {
    successMessage: 'Cooldown saved',
  })

  const discordAction = useAction(updateDiscordUserId, {
    successMessage: 'Discord User ID gespeichert',
  })

  const deactivateAction = useAction(togglePinger, {
    successMessage: 'Pinger deactivated',
  })

  const removeAllAction = useActionNoInput(removeAllKeywords, {
    successMessage: 'All keywords removed',
    onSuccess: () => setRemoveDialogOpen(false),
  })

  const discordIdChanged = discordId.trim() !== (discordUserId ?? '')

  return (
    <div className="space-y-8">
      {/* Discord User ID Section */}
      <div className="bg-ev-secondary rounded-xl border border-ev-border-default p-5 space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ev-text-primary">
            <MessageSquare className="size-4 text-ev-text-accent" />
            Discord User ID
          </h3>
          <p className="text-xs text-ev-text-secondary mt-1">
            Erforderlich für DMs, Server-Checks und Silently Autostart. Discord →
            Einstellungen → Erweitert → Entwicklermodus an → Rechtsklick auf dein
            Profil → &quot;User-ID kopieren&quot;.
          </p>
        </div>

        <div className="flex items-end gap-3">
          <div className="space-y-2 flex-1 max-w-[320px]">
            <Label htmlFor="discord-user-id" className="text-ev-text-secondary">
              Discord User ID (Snowflake)
            </Label>
            <Input
              id="discord-user-id"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="z.B. 581447756858785792"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value)}
              className="bg-ev-tertiary border-ev-border-default text-ev-text-primary font-mono"
            />
          </div>
          <Button
            onClick={() => discordAction.execute(discordId.trim())}
            disabled={discordAction.isPending || !discordIdChanged}
            size="default"
          >
            {discordAction.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      {/* Pinger Cooldown Section */}
      <div className="bg-ev-secondary rounded-xl border border-ev-border-default p-5 space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ev-text-primary">
            <Clock className="size-4 text-ev-text-accent" />
            Pinger Cooldown
          </h3>
          <p className="text-xs text-ev-text-secondary mt-1">
            Cooldown per channel and keyword combo. 0 = no cooldown.
          </p>
        </div>

        <div className="flex items-end gap-3">
          <div className="space-y-2 flex-1 max-w-[200px]">
            <Label htmlFor="cooldown" className="text-ev-text-secondary">
              Minutes
            </Label>
            <Input
              id="cooldown"
              type="number"
              min={0}
              value={cooldown}
              onChange={(e) => setCooldown(Number(e.target.value))}
              className="bg-ev-tertiary border-ev-border-default text-ev-text-primary"
            />
          </div>
          <Button
            onClick={() => cooldownAction.execute(cooldown)}
            disabled={cooldownAction.isPending || cooldown === cooldownMinutes}
            size="default"
          >
            {cooldownAction.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      {/* Danger Zone Section */}
      <div className="bg-ev-error/5 rounded-xl border border-ev-error/20 p-5 space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ev-error">
            <AlertTriangle className="size-4" />
            Danger Zone
          </h3>
          <p className="text-xs text-ev-text-secondary mt-1">
            Irreversible actions. Proceed with caution.
          </p>
        </div>

        {/* Deactivate Pinger */}
        <div className="flex items-center justify-between rounded-lg p-3 bg-ev-tertiary border border-ev-border-subtle">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-ev-text-primary">
              Deactivate Pinger
            </p>
            <p className="text-xs text-ev-text-tertiary">
              Stops all keyword notifications immediately.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deactivateAction.execute(false)}
            disabled={deactivateAction.isPending || !pingerActive}
          >
            {deactivateAction.isPending && <Loader2 className="size-3.5 animate-spin" />}
            <Power className="size-3.5" />
            {!pingerActive ? 'Already Off' : 'Deactivate'}
          </Button>
        </div>

        <Separator className="bg-ev-border-subtle" />

        {/* Remove All Keywords */}
        <div className="flex items-center justify-between rounded-lg p-3 bg-ev-tertiary border border-ev-border-subtle">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-ev-text-primary">
              Remove All Keywords
            </p>
            <p className="text-xs text-ev-text-tertiary">
              Permanently deletes every keyword you have configured.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setRemoveDialogOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Remove All
          </Button>
        </div>

        <ConfirmDialog
          open={removeDialogOpen}
          onOpenChange={setRemoveDialogOpen}
          title="Remove All Keywords?"
          description="This will permanently delete all of your keywords. This action cannot be undone."
          confirmLabel="Yes, Remove All"
          variant="destructive"
          isPending={removeAllAction.isPending}
          onConfirm={() => removeAllAction.execute()}
        />
      </div>
    </div>
  )
}
