'use client'

import { useState } from 'react'
import { Filter, Save, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { updateMinStock } from '@/lib/actions/silently'
import { useAction } from '@/hooks/use-action'

interface AutostartFiltersProps {
  minStock: number
}

export function AutostartFilters({ minStock }: AutostartFiltersProps) {
  const [value, setValue] = useState(minStock)

  const hasChanges = value !== minStock

  const { execute, isPending } = useAction(updateMinStock, {
    successMessage: 'Filter saved',
  })

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-gradient-to-br from-white/[0.06] to-white/[0.03] border border-ev-border-subtle">
            <Filter className="size-4 text-ev-text-accent" />
          </div>
          <div>
            <CardTitle className="text-ev-text-primary">
              Filters
            </CardTitle>
            <CardDescription className="text-ev-text-secondary">
              Minimum stock threshold for autostart
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="min-stock" className="text-ev-text-secondary">
            Minimum Stock
          </Label>
          <Input
            id="min-stock"
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(parseInt(e.target.value) || 0)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hasChanges) execute(value)
            }}
            className="max-w-[200px] bg-ev-tertiary border-ev-border-default text-ev-text-primary"
          />
          <p className="text-xs text-ev-text-tertiary">
            Only trigger autostart when the detected stock is at or above this value.
            Set to 0 to disable the filter.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => execute(value)}
          disabled={isPending || !hasChanges}
        >
          {isPending ? (
            <Loader2 className="size-3.5 mr-1 animate-spin" />
          ) : (
            <Save className="size-3.5" data-icon="inline-start" />
          )}
          Save Filter
        </Button>
      </CardContent>
    </Card>
  )
}
