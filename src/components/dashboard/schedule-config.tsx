'use client'

import { useState, useMemo } from 'react'
import { Clock, RotateCcw, Save, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { updateSchedule } from '@/lib/actions/silently'
import { useAction } from '@/hooks/use-action'

interface ScheduleConfigProps {
  scheduleStart: string | null
  scheduleEnd: string | null
}

export function ScheduleConfig({ scheduleStart, scheduleEnd }: ScheduleConfigProps) {
  const [start, setStart] = useState(scheduleStart ?? '')
  const [end, setEnd] = useState(scheduleEnd ?? '')

  const is247 = !scheduleStart && !scheduleEnd
  const hasChanges = start !== (scheduleStart ?? '') || end !== (scheduleEnd ?? '')

  const { execute: executeSave, isPending: isSaving } = useAction(
    (input: { start: string | null; end: string | null }) =>
      updateSchedule(input.start, input.end),
    { successMessage: 'Schedule saved' },
  )

  const { execute: executeReset, isPending: isResetting } = useAction(
    () => updateSchedule(null, null),
    {
      successMessage: 'Schedule reset to 24/7',
      onSuccess: () => {
        setStart('')
        setEnd('')
      },
    },
  )

  const isPending = isSaving || isResetting

  const windowType = useMemo(() => {
    if (!start || !end) return null
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const startMins = sh * 60 + sm
    const endMins = eh * 60 + em
    if (startMins === endMins) return null
    return endMins > startMins ? 'daytime' : 'overnight (crosses midnight)'
  }, [start, end])

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-gradient-to-br from-white/[0.06] to-white/[0.03] border border-ev-border-subtle">
            <Clock className="size-4 text-ev-text-accent" />
          </div>
          <div>
            <CardTitle className="text-ev-text-primary">
              Schedule
            </CardTitle>
            <CardDescription className="text-ev-text-secondary">
              {is247
                ? 'Running 24/7 -- no schedule restrictions'
                : `Active from ${scheduleStart} to ${scheduleEnd} CEST`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="schedule-start" className="text-ev-text-secondary">
              Start Time
            </Label>
            <Input
              id="schedule-start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="bg-ev-tertiary border-ev-border-default text-ev-text-primary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-end" className="text-ev-text-secondary">
              End Time
            </Label>
            <Input
              id="schedule-end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="bg-ev-tertiary border-ev-border-default text-ev-text-primary"
            />
          </div>
        </div>

        {/* Timezone and window type info */}
        <div className="flex items-center justify-between rounded-lg bg-ev-tertiary border border-ev-border-subtle px-3 py-2">
          <span className="text-xs text-ev-text-tertiary">
            Timezone: CEST
          </span>
          {windowType && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                windowType === 'daytime'
                  ? 'bg-ev-success/10 text-ev-success'
                  : 'bg-ev-warning/10 text-ev-warning'
              }`}
            >
              {windowType}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => executeSave({ start: start.trim() || null, end: end.trim() || null })}
            disabled={isPending || !hasChanges || !start || !end}
          >
            {isSaving ? (
              <Loader2 className="size-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="size-3.5" data-icon="inline-start" />
            )}
            Save Schedule
          </Button>
          {!is247 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => executeReset(undefined as void)}
              disabled={isPending}
            >
              {isResetting ? (
                <Loader2 className="size-3.5 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="size-3.5" data-icon="inline-start" />
              )}
              Reset to 24/7
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
