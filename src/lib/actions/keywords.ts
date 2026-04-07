'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { addKeywordsSchema } from '@/lib/validations'
import { handleActionError } from '@/lib/action-utils'
import type { ActionResult } from '@/types'

export async function addKeywords(input: {
  keywords: string
  restriction_type?: string
  internal_name?: string
  max_price?: number | string
  channel_ids?: string
  category_id?: string
}): Promise<ActionResult<{ count: number }>> {
  try {
    const profile = await getCurrentUser()

    const parsed = addKeywordsSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { keywords: rawKeywords, restriction_type, internal_name, max_price, channel_ids, category_id } = parsed.data

    const keywordList = rawKeywords
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(Boolean)

    if (keywordList.length === 0) {
      return { success: false, error: 'Mindestens ein Keyword eingeben' }
    }

    const rows = keywordList.map(keyword => ({
      user_id: profile.id,
      keyword,
      internal_name: internal_name?.trim() || null,
      restriction_type,
      channel_ids:
        restriction_type === 'channels' && channel_ids
          ? channel_ids.split(',').map(c => c.trim()).filter(Boolean)
          : null,
      category_id:
        restriction_type === 'category' ? category_id?.trim() || null : null,
      max_price: max_price ?? null,
    }))

    const supabase = await createServerClient()
    const { error } = await supabase.from('keywords').insert(rows)
    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/keywords')
    revalidatePath('/dashboard/autostart')
    revalidatePath('/dashboard')
    return { success: true, data: { count: keywordList.length } }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Fehler beim Hinzufuegen der Keywords') }
  }
}

export async function deleteKeywords(ids: string[]): Promise<ActionResult> {
  try {
    if (ids.length === 0) return { success: false, error: 'Keine Keywords ausgewaehlt' }

    const profile = await getCurrentUser()
    const supabase = await createServerClient()
    const { error } = await supabase
      .from('keywords')
      .delete()
      .in('id', ids)
      .eq('user_id', profile.id)
    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/keywords')
    revalidatePath('/dashboard/autostart')
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Fehler beim Loeschen der Keywords') }
  }
}

export async function updateKeywordName(id: string, internalName: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()
    const supabase = await createServerClient()
    const { error } = await supabase
      .from('keywords')
      .update({ internal_name: internalName.trim() || null })
      .eq('id', id)
      .eq('user_id', profile.id)
    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/keywords')
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Fehler beim Umbenennen') }
  }
}

export async function removeAllKeywords(): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()
    const supabase = await createServerClient()
    const { error } = await supabase
      .from('keywords')
      .delete()
      .eq('user_id', profile.id)
    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/keywords')
    revalidatePath('/dashboard/autostart')
    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Fehler beim Loeschen aller Keywords') }
  }
}
