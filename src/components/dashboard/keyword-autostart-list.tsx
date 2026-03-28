'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { Tag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { toggleKeywordAutostart } from '@/lib/actions/silently'
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
    }
  )

  const handleToggle = (keyword: string, enabled: boolean) => {
    startTransition(async () => {
      setOptimisticDisabled({ keyword, enabled })
      await toggleKeywordAutostart(keyword, enabled)
    })
  }

  if (keywords.length === 0) {
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
              <Tag className="size-4" style={{ color: 'var(--text-accent)' }} />
            </div>
            <div>
              <CardTitle style={{ color: 'var(--text-primary)' }}>
                Keyword Autostart
              </CardTitle>
              <CardDescription style={{ color: 'var(--text-secondary)' }}>
                No keywords configured yet
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Add keywords in the Keywords page to enable per-keyword autostart control.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-default)',
      }}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center size-9 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(192,192,192,0.08), rgba(192,192,192,0.04))',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Tag className="size-4" style={{ color: 'var(--text-accent)' }} />
            </div>
            <div>
              <CardTitle style={{ color: 'var(--text-primary)' }}>
                Keyword Autostart
              </CardTitle>
              <CardDescription style={{ color: 'var(--text-secondary)' }}>
                Control which keywords trigger autostart
              </CardDescription>
            </div>
          </div>
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--text-tertiary)' }}
          >
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
                className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
                style={{
                  backgroundColor: isEnabled ? 'transparent' : 'var(--bg-tertiary)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="inline-block size-1.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: isEnabled ? 'var(--success)' : 'var(--text-tertiary)',
                    }}
                  />
                  <div className="min-w-0">
                    <span
                      className="text-sm font-medium block truncate"
                      style={{
                        color: isEnabled ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      }}
                    >
                      {kw.keyword}
                    </span>
                    {kw.internal_name && (
                      <span
                        className="text-xs block truncate"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
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
