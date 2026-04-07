'use client'

import { useOptimistic, useTransition } from 'react'
import { Tag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { toggleKeywordAutostart } from '@/lib/actions/silently'
import { useAction } from '@/hooks/use-action'
import type { Keyword } from '@/types'

interface KeywordAutostartListProps {
  keywords: Keyword[]
  disabledKeywords: string[]
}

export function KeywordAutostartList({ keywords, disabledKeywords }: KeywordAutostartListProps) {
  const [isPending, startTransition] = useTransition()
  const [optimisticDisabled, setOptimisticDisabled] = useOptimistic(
    disabledKeywords,
    (current: string[], { keyword, enabled }: { keyword: string; enabled: boolean }) => {
      if (enabled) {
        return current.filter((k) => k !== keyword)
      }
      return [...current, keyword]
    },
  )

  const { execute } = useAction(
    (input: { keyword: string; enabled: boolean }) =>
      toggleKeywordAutostart(input.keyword, input.enabled),
  )

  const handleToggle = (keyword: string, enabled: boolean) => {
    startTransition(() => {
      setOptimisticDisabled({ keyword, enabled })
      execute({ keyword, enabled })
    })
  }

  const iconBlock = (
    <div className="flex items-center justify-center size-9 rounded-lg bg-gradient-to-br from-white/[0.06] to-white/[0.03] border border-ev-border-subtle">
      <Tag className="size-4 text-ev-text-accent" />
    </div>
  )

  if (keywords.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            {iconBlock}
            <div>
              <CardTitle className="text-ev-text-primary">
                Keyword Autostart
              </CardTitle>
              <CardDescription className="text-ev-text-secondary">
                No keywords configured yet
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ev-text-tertiary">
            Add keywords in the Keywords page to enable per-keyword autostart control.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {iconBlock}
            <div>
              <CardTitle className="text-ev-text-primary">
                Keyword Autostart
              </CardTitle>
              <CardDescription className="text-ev-text-secondary">
                Control which keywords trigger autostart
              </CardDescription>
            </div>
          </div>
          <span className="text-xs font-medium text-ev-text-tertiary">
            {keywords.length - optimisticDisabled.length}/{keywords.length} active
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-1">
          {keywords.map((kw) => {
            const isEnabled = !optimisticDisabled.includes(kw.keyword)

            return (
              <div
                key={kw.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${
                  isEnabled ? 'bg-transparent' : 'bg-ev-tertiary'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`inline-block size-1.5 rounded-full flex-shrink-0 ${
                      isEnabled ? 'bg-ev-success' : 'bg-ev-text-tertiary'
                    }`}
                  />
                  <div className="min-w-0">
                    <span
                      className={`text-sm font-medium block truncate ${
                        isEnabled ? 'text-ev-text-primary' : 'text-ev-text-tertiary'
                      }`}
                    >
                      {kw.keyword}
                    </span>
                    {kw.internal_name && (
                      <span className="text-xs block truncate text-ev-text-tertiary">
                        {kw.internal_name}
                      </span>
                    )}
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => handleToggle(kw.keyword, checked)}
                  disabled={isPending}
                  size="sm"
                />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
