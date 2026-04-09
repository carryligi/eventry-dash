'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface ImportResult {
  profiles: number
  keywords: number
  pingerSettings: number
  pushoverSettings: number
  silentlySettings: number
  autostartDisabled: number
}

export async function importBotData(formData: FormData): Promise<ImportResult> {
  await requireAdmin()
  const supabase = await createServerClient()

  const result: ImportResult = {
    profiles: 0,
    keywords: 0,
    pingerSettings: 0,
    pushoverSettings: 0,
    silentlySettings: 0,
    autostartDisabled: 0,
  }

  const parseFile = async (file: File | null) => {
    if (!file || file.size === 0) return null
    const text = await file.text()
    return JSON.parse(text)
  }

  const keywordsJson = await parseFile(formData.get('keywords') as File | null)
  const pingerJson = await parseFile(formData.get('pinger_status') as File | null)
  const cooldownsJson = await parseFile(formData.get('cooldowns') as File | null)
  const pushoverJson = await parseFile(formData.get('pushover_keys') as File | null)
  const silentlyJson = await parseFile(formData.get('silently_keys') as File | null)
  const minStockJson = await parseFile(formData.get('min_stock') as File | null)
  const scheduleJson = await parseFile(formData.get('autostart_schedule') as File | null)
  const disabledKwsJson = await parseFile(
    formData.get('autostart_disabled_keywords') as File | null
  )

  // Collect all user IDs from every file
  const allUserIds = new Set<string>()
  for (const json of [
    keywordsJson,
    pingerJson,
    cooldownsJson?.duration,
    pushoverJson,
    silentlyJson,
    minStockJson,
    scheduleJson,
    disabledKwsJson,
  ]) {
    if (json && typeof json === 'object') {
      Object.keys(json).forEach((id) => allUserIds.add(id))
    }
  }

  // Create placeholder profiles for all discovered user IDs
  for (const userId of allUserIds) {
    await supabase.from('profiles').upsert(
      {
        id: userId,
        username: `User ${userId.slice(-4)}`,
        is_admin: false,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    result.profiles++
  }

  // Import keywords — legacy JSON may carry category_id (single) and/or channel_ids.
  // Legacy "globals" (neither scope) are now imported as global keywords
  // (both channel_ids and category_ids NULL) since the bot treats that as
  // "match everywhere the bot listens".
  if (keywordsJson) {
    for (const [userId, keywords] of Object.entries(keywordsJson)) {
      const rows = (keywords as Record<string, unknown>[]).map(
        (kw: Record<string, unknown>) => {
          const channelIds =
            Array.isArray(kw.channel_ids) && kw.channel_ids.length > 0
              ? (kw.channel_ids as string[])
              : null
          const legacyCategoryId =
            typeof kw.category_id === 'string' && kw.category_id
              ? (kw.category_id as string)
              : null
          const categoryIds = legacyCategoryId ? [legacyCategoryId] : null

          return {
            id: kw.id as string,
            user_id: userId,
            keyword: kw.keyword as string,
            internal_name: (kw.internal_name as string) || null,
            channel_ids: channelIds,
            category_ids: categoryIds,
            max_price: null,
          }
        },
      )

      if (rows.length > 0) {
        await supabase.from('keywords').upsert(rows, { onConflict: 'id' })
        result.keywords += rows.length
      }
    }
  }

  // Import pinger settings
  if (pingerJson) {
    for (const [userId, isActive] of Object.entries(pingerJson)) {
      const cooldownMinutes = cooldownsJson?.duration?.[userId] ?? 0
      await supabase.from('pinger_settings').upsert(
        {
          user_id: userId,
          is_active: Boolean(isActive),
          cooldown_minutes: cooldownMinutes,
        },
        { onConflict: 'user_id' }
      )
      result.pingerSettings++
    }
  }

  // Import pushover settings
  if (pushoverJson) {
    for (const [userId, data] of Object.entries(pushoverJson)) {
      const d = data as Record<string, unknown>
      const key = typeof d === 'string' ? d : (d.key as string)
      const priority = typeof d === 'string' ? 0 : ((d.priority as number) ?? 0)
      if (key) {
        await supabase.from('pushover_settings').upsert(
          {
            user_id: userId,
            user_key: key,
            priority,
          },
          { onConflict: 'user_id' }
        )
        result.pushoverSettings++
      }
    }
  }

  // Import silently settings (merge silently_keys + min_stock + schedule)
  if (silentlyJson) {
    for (const [userId, data] of Object.entries(silentlyJson)) {
      const d = data as Record<string, unknown>
      const key = typeof d === 'string' ? d : (d.key as string)
      const active = typeof d === 'string' ? true : ((d.active as boolean) ?? true)
      const minStock = minStockJson?.[userId] ?? 0
      const schedule = scheduleJson?.[userId] as
        | { start: string; end: string }
        | undefined

      let scheduleStart: string | null = null
      let scheduleEnd: string | null = null
      if (schedule) {
        scheduleStart = schedule.start.replace('.', ':') + ':00'
        scheduleEnd = schedule.end.replace('.', ':') + ':00'
      }

      if (key) {
        await supabase.from('silently_settings').upsert(
          {
            user_id: userId,
            user_key: key,
            is_active: active,
            min_stock: minStock,
            schedule_start: scheduleStart,
            schedule_end: scheduleEnd,
          },
          { onConflict: 'user_id' }
        )
        result.silentlySettings++
      }
    }
  }

  // Import autostart disabled keywords
  if (disabledKwsJson) {
    for (const [userId, keywords] of Object.entries(disabledKwsJson)) {
      for (const kw of keywords as string[]) {
        await supabase.from('autostart_disabled_keywords').upsert(
          {
            user_id: userId,
            keyword: kw,
          },
          { onConflict: 'user_id,keyword' }
        )
        result.autostartDisabled++
      }
    }
  }

  revalidatePath('/dashboard/admin')
  return result
}
