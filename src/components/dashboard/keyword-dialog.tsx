'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus, Loader2, AlertTriangle, Eraser, Globe } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { addKeywords, updateKeyword } from '@/lib/actions/keywords'
import { useAction } from '@/hooks/use-action'
import { DiscordChannelPicker } from './discord-channel-picker'
import { useDiscordChannels } from './use-discord-channels'
import type { Keyword } from '@/types'

interface KeywordDialogProps {
  /** When provided, the dialog runs in EDIT mode — pre-filled and calls updateKeyword. */
  keyword?: Keyword
  /** Controlled open state. If omitted, the component manages its own state. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Override the default "+ Add Keywords" trigger button. Pass `null` to render no trigger (controlled mode). */
  trigger?: React.ReactElement | null
  /**
   * Global min_stock from silently_settings. Shown as placeholder/fallback hint
   * when the per-keyword value is empty (NULL). If undefined, falls back to 0.
   */
  globalMinStock?: number
}

export function KeywordDialog({
  keyword,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  globalMinStock,
}: KeywordDialogProps) {
  const isEdit = !!keyword
  const isControlled = controlledOpen !== undefined

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (isControlled) controlledOnOpenChange?.(next)
    else setUncontrolledOpen(next)
  }

  const [keywordText, setKeywordText] = useState(keyword?.keyword ?? '')
  const [internalName, setInternalName] = useState(keyword?.internal_name ?? '')
  const [maxPrice, setMaxPrice] = useState<string>(
    keyword?.max_price != null ? String(keyword.max_price) : '',
  )
  // Empty string = NULL in DB = fall back to global silently_settings.min_stock.
  const [minStock, setMinStock] = useState<string>(
    keyword?.min_stock != null ? String(keyword.min_stock) : '',
  )
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>(
    keyword?.channel_ids ?? [],
  )
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    keyword?.category_ids ?? [],
  )
  // A keyword with neither channels nor categories is "global" — it matches
  // everywhere the bot listens. When editing, detect that state and prefill
  // the toggle so the user sees the current configuration at a glance.
  const [isGlobal, setIsGlobal] = useState<boolean>(
    () => !!keyword && !keyword.channel_ids?.length && !keyword.category_ids?.length,
  )

  const { data: discordData } = useDiscordChannels()

  // Reset form state whenever the dialog opens or the target keyword changes.
  useEffect(() => {
    if (!open) return
    setKeywordText(keyword?.keyword ?? '')
    setInternalName(keyword?.internal_name ?? '')
    setMaxPrice(keyword?.max_price != null ? String(keyword.max_price) : '')
    setMinStock(keyword?.min_stock != null ? String(keyword.min_stock) : '')
    setSelectedChannelIds(keyword?.channel_ids ?? [])
    setSelectedCategoryIds(keyword?.category_ids ?? [])
    setIsGlobal(
      !!keyword && !keyword.channel_ids?.length && !keyword.category_ids?.length,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, keyword?.id])

  // Enabling Global clears any existing scope selection.
  const handleToggleGlobal = (next: boolean) => {
    setIsGlobal(next)
    if (next) {
      setSelectedChannelIds([])
      setSelectedCategoryIds([])
    }
  }

  // Selecting anything in the scope pickers turns Global off automatically
  // so the user can't accidentally leave stale selections behind.
  const handleChannelChange = (ids: string[]) => {
    setSelectedChannelIds(ids)
    if (ids.length > 0 && isGlobal) setIsGlobal(false)
  }
  const handleCategoryChange = (ids: string[]) => {
    setSelectedCategoryIds(ids)
    if (ids.length > 0 && isGlobal) setIsGlobal(false)
  }

  const { execute: executeAdd, isPending: isAdding, error: addError } = useAction(addKeywords, {
    successMessage: 'Keywords added',
    onSuccess: () => setOpen(false),
  })
  const { execute: executeUpdate, isPending: isUpdating, error: updateError } = useAction(
    updateKeyword,
    {
      successMessage: 'Keyword updated',
      onSuccess: () => setOpen(false),
    },
  )

  const isPending = isAdding || isUpdating
  const formError = addError || updateError

  // Redundancy: channels whose parent category is already selected.
  const redundantChannelIds = useMemo(() => {
    if (!discordData || selectedChannelIds.length === 0 || selectedCategoryIds.length === 0) {
      return [] as string[]
    }
    const catSet = new Set(selectedCategoryIds)
    return selectedChannelIds.filter((chId) => {
      for (const cat of discordData.categories) {
        if (cat.channels.some((ch) => ch.id === chId) && catSet.has(cat.id)) return true
      }
      return false
    })
  }, [discordData, selectedChannelIds, selectedCategoryIds])

  const redundantChannelNames = useMemo(() => {
    if (redundantChannelIds.length === 0 || !discordData) return [] as string[]
    const allChannels = discordData.categories.flatMap((c) => c.channels)
    return redundantChannelIds.map(
      (id) => allChannels.find((ch) => ch.id === id)?.name ?? id,
    )
  }, [redundantChannelIds, discordData])

  const removeRedundantChannels = () => {
    setSelectedChannelIds((prev) => prev.filter((id) => !redundantChannelIds.includes(id)))
  }

  const hasScope =
    isGlobal || selectedChannelIds.length > 0 || selectedCategoryIds.length > 0
  const canSubmit = hasScope && keywordText.trim().length > 0 && !isPending

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSubmit) return

    // Global mode: send both scope fields as undefined so parseIdList on the
    // server turns them into NULL in the DB.
    const payload = {
      internal_name: internalName,
      max_price: maxPrice,
      min_stock: minStock,
      channel_ids:
        !isGlobal && selectedChannelIds.length > 0
          ? selectedChannelIds.join(',')
          : undefined,
      category_ids:
        !isGlobal && selectedCategoryIds.length > 0
          ? selectedCategoryIds.join(',')
          : undefined,
    }

    if (isEdit && keyword) {
      executeUpdate({ id: keyword.id, keyword: keywordText, ...payload })
    } else {
      executeAdd({ keywords: keywordText, ...payload })
    }
  }

  // Default trigger (create mode) — omitted when `trigger === null`.
  const showTrigger = trigger !== null
  const resolvedTrigger =
    trigger ?? (
      <Button variant="glass" size="sm">
        <Plus className="size-3.5 mr-1" />
        Add Keywords
      </Button>
    )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && !isControlled && <DialogTrigger render={resolvedTrigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit "${keyword?.keyword}"` : 'Add Keywords'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the keyword scope, name, and max price.'
              : 'Enter one or more keywords separated by commas. They will be monitored across the configured channels and categories.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Keyword(s) input */}
          <div className="space-y-2">
            <Label htmlFor="kw-keywords">
              {isEdit ? 'Keyword' : 'Keywords'}
              {!isEdit && (
                <span className="text-xs ml-1 text-ev-text-tertiary">(comma-separated)</span>
              )}
            </Label>
            {isEdit ? (
              <Input
                id="kw-keywords"
                value={keywordText}
                onChange={(e) => setKeywordText(e.target.value)}
                placeholder="Taylor Swift"
                required
              />
            ) : (
              <Textarea
                id="kw-keywords"
                value={keywordText}
                onChange={(e) => setKeywordText(e.target.value)}
                placeholder="Taylor Swift, Bad Bunny, Coldplay"
                required
                className="min-h-[72px]"
              />
            )}
          </div>

          {/* Internal name */}
          <div className="space-y-2">
            <Label htmlFor="kw-name">
              Internal Name
              <span className="text-xs ml-1 text-ev-text-tertiary">(optional)</span>
            </Label>
            <Input
              id="kw-name"
              value={internalName}
              onChange={(e) => setInternalName(e.target.value)}
              placeholder="e.g. Taylor Swift Tour 2026"
            />
          </div>

          {/* Global toggle — when on, the keyword matches everywhere */}
          <div className="flex items-start justify-between gap-3 rounded-lg border border-ev-border-subtle bg-ev-tertiary px-3 py-2.5">
            <div className="flex items-start gap-2 min-w-0">
              <Globe className="size-4 shrink-0 mt-0.5 text-ev-text-accent" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ev-text-primary">
                  Global
                </p>
                <p className="text-xs text-ev-text-tertiary">
                  Matches in all categories and channels. No scope needed.
                </p>
              </div>
            </div>
            <Switch
              checked={isGlobal}
              onCheckedChange={handleToggleGlobal}
              aria-label="Global scope"
            />
          </div>

          {/* Channels — wrapper dims and ignores pointer events when Global is on */}
          <div
            aria-hidden={isGlobal}
            className={`space-y-2 transition-opacity ${
              isGlobal ? 'pointer-events-none opacity-50 select-none' : ''
            }`}
          >
            <Label>Channels</Label>
            <DiscordChannelPicker
              mode="channels"
              selectedIds={selectedChannelIds}
              onSelectionChange={handleChannelChange}
            />
          </div>

          {/* Categories — same dimming behaviour */}
          <div
            aria-hidden={isGlobal}
            className={`space-y-2 transition-opacity ${
              isGlobal ? 'pointer-events-none opacity-50 select-none' : ''
            }`}
          >
            <Label>Categories</Label>
            <DiscordChannelPicker
              mode="category"
              selectedIds={selectedCategoryIds}
              onSelectionChange={handleCategoryChange}
            />
          </div>

          {/* Redundancy warning */}
          {redundantChannelIds.length > 0 && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-3.5 flex-shrink-0 mt-0.5 text-yellow-500/90" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ev-text-primary">
                    Redundant channels
                  </p>
                  <p className="text-xs text-ev-text-secondary mt-0.5">
                    {redundantChannelNames.map((n) => `#${n}`).join(', ')}{' '}
                    {redundantChannelNames.length === 1 ? 'is' : 'are'} already part of
                    a selected category.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeRedundantChannels}
                className="self-start h-7 text-xs text-yellow-500/90"
              >
                <Eraser className="size-3 mr-1" />
                Remove redundant channels
              </Button>
            </div>
          )}

          <p className="text-xs text-ev-text-tertiary">
            Enable Global or select at least one channel or category.
          </p>

          {/* Max price */}
          <div className="space-y-2">
            <Label htmlFor="kw-price">
              Max Price
              <span className="text-xs ml-1 text-ev-text-tertiary">(optional)</span>
            </Label>
            <Input
              id="kw-price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>

          {/* Min stock — per-keyword autostart threshold */}
          <div className="space-y-2">
            <Label htmlFor="kw-min-stock">
              Min Stock
              <span className="text-xs ml-1 text-ev-text-tertiary">(optional)</span>
            </Label>
            <Input
              id="kw-min-stock"
              type="number"
              step="1"
              min="0"
              placeholder={
                globalMinStock != null
                  ? `Global (${globalMinStock})`
                  : 'Global'
              }
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
            />
            <p className="text-xs text-ev-text-tertiary">
              Overrides the global autostart threshold for this keyword. Leave empty to use the global value.
            </p>
          </div>

          {formError && <p className="text-xs text-ev-error">{formError}</p>}

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit}>
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 mr-1 animate-spin" />
                  {isEdit ? 'Saving...' : 'Adding...'}
                </>
              ) : isEdit ? (
                'Save changes'
              ) : (
                'Add Keywords'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
