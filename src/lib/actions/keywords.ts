'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function addKeywords(formData: FormData) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()

  const rawKeywords = (formData.get('keywords') as string) ?? ''
  const keywords = rawKeywords
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
  const restrictionType =
    (formData.get('restriction_type') as string) ?? 'global'
  const internalName = formData.get('internal_name') as string | null
  const maxPrice = formData.get('max_price') as string | null
  const channelIds = formData.get('channel_ids') as string | null
  const categoryId = formData.get('category_id') as string | null

  if (keywords.length === 0) throw new Error('No keywords provided')

  const rows = keywords.map((keyword) => ({
    user_id: profile.id,
    keyword,
    internal_name: internalName?.trim() || null,
    restriction_type: restrictionType,
    channel_ids:
      restrictionType === 'channels' && channelIds
        ? channelIds
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean)
        : null,
    category_id:
      restrictionType === 'category' ? categoryId?.trim() || null : null,
    max_price: maxPrice ? parseFloat(maxPrice) : null,
  }))

  const { error } = await supabase.from('keywords').insert(rows)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/keywords')
  revalidatePath('/dashboard')
}

export async function deleteKeywords(ids: string[]) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('keywords')
    .delete()
    .in('id', ids)
    .eq('user_id', profile.id)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/keywords')
  revalidatePath('/dashboard')
}

export async function updateKeywordName(id: string, internalName: string) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('keywords')
    .update({
      internal_name: internalName.trim() || null,
    })
    .eq('id', id)
    .eq('user_id', profile.id)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/keywords')
}
