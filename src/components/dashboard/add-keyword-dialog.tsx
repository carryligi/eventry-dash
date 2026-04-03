'use client'

import { useState, useTransition } from 'react'
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
import { Plus } from 'lucide-react'
import { addKeywords } from '@/lib/actions/keywords'

export function AddKeywordDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [scope, setScope] = useState<string>('global')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('restriction_type', scope)

    startTransition(async () => {
      try {
        await addKeywords(formData)
        setOpen(false)
        setScope('global')
        form.reset()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add keywords')
      }
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
              <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>
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
              <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>
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
            <Select value={scope} onValueChange={(v) => { if (v) setScope(v) }}>
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

          {/* Conditional: Channel IDs */}
          {scope === 'channels' && (
            <div className="space-y-2">
              <Label htmlFor="kw-channels">
                Channel IDs
                <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>
                  (comma-separated)
                </span>
              </Label>
              <Input
                id="kw-channels"
                name="channel_ids"
                placeholder="123456789, 987654321"
              />
            </div>
          )}

          {/* Conditional: Category ID */}
          {scope === 'category' && (
            <div className="space-y-2">
              <Label htmlFor="kw-category">Category ID</Label>
              <Input
                id="kw-category"
                name="category_id"
                placeholder="category-id"
              />
            </div>
          )}

          {/* Max price */}
          <div className="space-y-2">
            <Label htmlFor="kw-price">
              Max Price
              <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>
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
            <p className="text-xs" style={{ color: 'var(--error)' }}>
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Adding...' : 'Add Keywords'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
