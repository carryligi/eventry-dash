'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { addKeywordsSchema, updateKeywordSchema } from '@/lib/validations'
import { handleActionError } from '@/lib/action-utils'
import type { ActionResult, Keyword } from '@/types'

function parseIdList(raw?: string): string[] | null {
  if (!raw) return null
  const list = raw
    .split(',')
    .map(c => c.trim())
    .filter(Boolean)
  return list.length > 0 ? list : null
}

function revalidateKeywordPaths() {
  revalidatePath('/dashboard/keywords')
  revalidatePath('/dashboard/autostart')
  revalidatePath('/dashboard')
}

export async function addKeywords(input: {
  keywords: string
  internal_name?: string
  max_price?: number | string
  min_stock?: number | string
  channel_ids?: string
  category_ids?: string
}): Promise<ActionResult<{ count: number }>> {
  try {
    const profile = await getCurrentUser()

    const parsed = addKeywordsSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { keywords: rawKeywords, internal_name, max_price, min_stock, channel_ids, category_ids } = parsed.data

    const keywordList = rawKeywords
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(Boolean)

    if (keywordList.length === 0) {
      return { success: false, error: 'Enter at least one keyword' }
    }

    const channelIds = parseIdList(channel_ids)
    const categoryIds = parseIdList(category_ids)

    const rows = keywordList.map(keyword => ({
      user_id: profile.id,
      keyword,
      internal_name: internal_name?.trim() || null,
      channel_ids: channelIds,
      category_ids: categoryIds,
      max_price: max_price ?? null,
      min_stock: min_stock ?? null,
    }))

    const supabase = await createServerClient()
    const { error } = await supabase.from('keywords').insert(rows)
    if (error) return { success: false, error: error.message }

    revalidateKeywordPaths()
    return { success: true, data: { count: keywordList.length } }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to add keywords') }
  }
}

export async function updateKeyword(input: {
  id: string
  keyword: string
  internal_name?: string
  max_price?: number | string
  min_stock?: number | string
  channel_ids?: string
  category_ids?: string
}): Promise<ActionResult<{ keyword: Keyword }>> {
  try {
    const profile = await getCurrentUser()

    const parsed = updateKeywordSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { id, keyword, internal_name, max_price, min_stock, channel_ids, category_ids } = parsed.data

    const channelIds = parseIdList(channel_ids)
    const categoryIds = parseIdList(category_ids)

    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('keywords')
      .update({
        keyword: keyword.trim().toLowerCase(),
        internal_name: internal_name?.trim() || null,
        channel_ids: channelIds,
        category_ids: categoryIds,
        max_price: max_price ?? null,
        min_stock: min_stock ?? null,
      })
      .eq('id', id)
      .eq('user_id', profile.id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    if (!data) return { success: false, error: 'Keyword not found' }

    revalidateKeywordPaths()
    return { success: true, data: { keyword: data as Keyword } }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to update keyword') }
  }
}

export async function deleteKeywords(ids: string[]): Promise<ActionResult> {
  try {
    if (ids.length === 0) return { success: false, error: 'No keywords selected' }

    const profile = await getCurrentUser()
    const supabase = await createServerClient()
    const { error } = await supabase
      .from('keywords')
      .delete()
      .in('id', ids)
      .eq('user_id', profile.id)
    if (error) return { success: false, error: error.message }

    revalidateKeywordPaths()
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to delete keywords') }
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
    return { success: false, error: handleActionError(err, 'Failed to delete all keywords') }
  }
}
