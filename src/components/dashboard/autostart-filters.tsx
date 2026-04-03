'use client'

import { useState, useTransition } from 'react'
import { Filter, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { updateMinStock } from '@/lib/actions/silently'

interface AutostartFiltersProps {
  minStock: number
}

export function AutostartFilters({ minStock }: AutostartFiltersProps) {
  const [value, setValue] = useState(minStock)
  const [isPending, startTransition] = useTransition()

  const hasChanges = value !== minStock

  const handleSave = () => {
    startTransition(async () => {
      await updateMinStock(value)
    })
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center size-9 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Filter className="size-4" style={{ color: 'var(--text-accent)' }} />
          </div>
          <div>
            <CardTitle style={{ color: 'var(--text-primary)' }}>
              Filters
            </CardTitle>
            <CardDescription style={{ color: 'var(--text-secondary)' }}>
              Minimum stock threshold for autostart
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="min-stock" style={{ color: 'var(--text-secondary)' }}>
            Minimum Stock
          </Label>
          <Input
            id="min-stock"
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(parseInt(e.target.value) || 0)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hasChanges) handleSave()
            }}
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
            className="max-w-[200px]"
          />
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Only trigger autostart when the detected stock is at or above this value.
            Set to 0 to disable the filter.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending || !hasChanges}
        >
          <Save className="size-3.5" data-icon="inline-start" />
          Save Filter
        </Button>
      </CardContent>
    </Card>
  )
}
