'use client'

import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import { addKeywords } from '@/lib/actions/keywords'
import { useAction } from '@/hooks/use-action'
import { DiscordChannelPicker } from './discord-channel-picker'

export function AddKeywordDialog() {
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<string>('global')
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  const { execute, isPending, error } = useAction(addKeywords, {
    successMessage: 'Keywords added',
    onSuccess: () => {
      setOpen(false)
      setScope('global')
      setSelectedChannelIds([])
      setSelectedCategoryId('')
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    execute({
      keywords: formData.get('keywords') as string,
      restriction_type: scope,
      internal_name: formData.get('internal_name') as string,
      max_price: formData.get('max_price') as string,
      channel_ids:
        scope === 'channels' && selectedChannelIds.length > 0
          ? selectedChannelIds.join(',')
          : undefined,
      category_id:
        scope === 'category' && selectedCategoryId
          ? selectedCategoryId
          : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="glass" size="sm">
            <Plus className="size-3.5 mr-1" />
            Add Keywords
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Keywords</DialogTitle>
          <DialogDescription>
            Enter one or more keywords separated by commas. They will be
            monitored across configured channels.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Keywords input */}
          <div className="space-y-2">
            <Label htmlFor="kw-keywords">
              Keywords
              <span className="text-xs ml-1 text-ev-text-tertiary">
                (comma-separated)
              </span>
            </Label>
            <Textarea
              id="kw-keywords"
              name="keywords"
              placeholder="keyword1, keyword2, keyword3"
              required
              className="min-h-[72px]"
            />
          </div>

          {/* Internal name */}
          <div className="space-y-2">
            <Label htmlFor="kw-name">
              Internal Name
              <span className="text-xs ml-1 text-ev-text-tertiary">
                (optional)
              </span>
            </Label>
            <Input
              id="kw-name"
              name="internal_name"
              placeholder="e.g. Nike Dunks"
            />
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <Label>Scope</Label>
            <Select
              value={scope}
              onValueChange={(v) => {
                if (v) {
                  setScope(v)
                  setSelectedChannelIds([])
                  setSelectedCategoryId('')
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="channels">Specific Channels</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional: Channel picker */}
          {scope === 'channels' && (
            <div className="space-y-2">
              <Label>Channels</Label>
              <DiscordChannelPicker
                mode="channels"
                selectedIds={selectedChannelIds}
                onSelectionChange={setSelectedChannelIds}
              />
            </div>
          )}

          {/* Conditional: Category picker */}
          {scope === 'category' && (
            <div className="space-y-2">
              <Label>Category</Label>
              <DiscordChannelPicker
                mode="category"
                selectedIds={selectedCategoryId ? [selectedCategoryId] : []}
                onSelectionChange={(ids) =>
                  setSelectedCategoryId(ids[0] ?? '')
                }
              />
            </div>
          )}

          {/* Max price */}
          <div className="space-y-2">
            <Label htmlFor="kw-price">
              Max Price
              <span className="text-xs ml-1 text-ev-text-tertiary">
                (optional)
              </span>
            </Label>
            <Input
              id="kw-price"
              name="max_price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>

          {error && (
            <p className="text-xs text-ev-error">{error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 mr-1 animate-spin" />
                  Adding...
                </>
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
