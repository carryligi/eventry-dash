'use client'

import { useState, useTransition, useMemo } from 'react'
import { Clock, RotateCcw, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { updateSchedule } from '@/lib/actions/silently'

interface ScheduleConfigProps {
  scheduleStart: string | null
  scheduleEnd: string | null
}

export function ScheduleConfig({ scheduleStart, scheduleEnd }: ScheduleConfigProps) {
  const [start, setStart] = useState(scheduleStart ?? '')
  const [end, setEnd] = useState(scheduleEnd ?? '')
  const [isPending, startTransition] = useTransition()

  const is247 = !scheduleStart && !scheduleEnd
  const hasChanges = start !== (scheduleStart ?? '') || end !== (scheduleEnd ?? '')

  const windowType = useMemo(() => {
    if (!start || !end) return null
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const startMins = sh * 60 + sm
    const endMins = eh * 60 + em
    if (startMins === endMins) return null
    return endMins > startMins ? 'daytime' : 'overnight (crosses midnight)'
  }, [start, end])

  const handleSave = () => {
    const startVal = start.trim() || null
    const endVal = end.trim() || null
    startTransition(async () => {
      await updateSchedule(startVal, endVal)
    })
  }

  const handleReset = () => {
    startTransition(async () => {
      await updateSchedule(null, null)
      setStart('')
      setEnd('')
    })
  }

  return (
    <Card
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-default)',
      }}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center size-9 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(192,192,192,0.08), rgba(192,192,192,0.04))',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Clock className="size-4" style={{ color: 'var(--text-accent)' }} />
          </div>
          <div>
            <CardTitle style={{ color: 'var(--text-primary)' }}>
              Schedule
            </CardTitle>
            <CardDescription style={{ color: 'var(--text-secondary)' }}>
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
            <Label htmlFor="schedule-start" style={{ color: 'var(--text-secondary)' }}>
              Start Time
            </Label>
            <Input
              id="schedule-start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-end" style={{ color: 'var(--text-secondary)' }}>
              End Time
            </Label>
            <Input
              id="schedule-end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Timezone and window type info */}
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Timezone: CEST
          </span>
          {windowType && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: windowType === 'daytime'
                  ? 'rgba(74, 222, 128, 0.1)'
                  : 'rgba(251, 191, 36, 0.1)',
                color: windowType === 'daytime'
                  ? 'var(--success)'
                  : 'var(--warning)',
              }}
            >
              {windowType}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending || !hasChanges || !start || !end}
          >
            <Save className="size-3.5" data-icon="inline-start" />
            Save Schedule
          </Button>
          {!is247 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isPending}
            >
              <RotateCcw className="size-3.5" data-icon="inline-start" />
              Reset to 24/7
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
