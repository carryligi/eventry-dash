'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { handleActionError } from '@/lib/action-utils'
import { parseEventryExport } from '@/lib/import/eventry-parser'
import {
  EventryParseError,
  type CommitEventryImportInput,
  type ImportSummary,
} from '@/lib/import/eventry-types'
import type { ActionResult } from '@/types'

/**
 * Import a user's settings from a legacy Eventry JSON export.
 *
 * Replace-all semantics: deletes the user's existing keywords / settings
 * and writes the parsed payload in their place. Not atomic — if a step
 * fails, the import can be retried because the operation is idempotent.
 */
export async function commitEventryImport(
  input: CommitEventryImportInput,
): Promise<ActionResult<ImportSummary>> {
  try {
    const profile = await getCurrentUser()
    const userId = profile.id

    // 1. Re-parse server-side (never trust the client's preview)
    let parsed
    try {
      const rawData = JSON.parse(input.rawJson)
      parsed = parseEventryExport(rawData)
    } catch (err) {
      if (err instanceof EventryParseError) {
        return { success: false, error: err.message }
      }
      return {
        success: false,
        error: `Invalid JSON file: ${err instanceof Error ? err.message : 'unknown error'}`,
      }
    }

    // 2. Keywords go in as-is. Scopeless ones become "global" keywords
    //    (both channel_ids and category_ids NULL) — the bot interprets
    //    that as "match everywhere I listen".
    const finalKeywords = parsed.keywords
    const globalKeywordCount = finalKeywords.filter(
      (kw) => !kw.channelIds?.length && !kw.categoryIds?.length,
    ).length

    const supabase = await createServerClient()

    // 3. DELETE existing data for this user (replace-all)
    const deleteOps = [
      supabase.from('keywords').delete().eq('user_id', userId),
      supabase.from('autostart_disabled_keywords').delete().eq('user_id', userId),
      supabase.from('active_cooldowns').delete().eq('user_id', userId),
    ]
    for (const op of deleteOps) {
      const { error } = await op
      if (error) {
        return {
          success: false,
          error: `Failed to delete old data: ${error.message}`,
        }
      }
    }

    // 4. UPDATE profile (onboarded flag + optional Discord ID)
    //    discord_user_id is only touched when the import actually provided
    //    a valid snowflake — otherwise we leave any existing value in place
    //    so the user can set it later via Settings.
    {
      const updatePayload: {
        is_onboarded: true
        discord_user_id?: string
      } = { is_onboarded: true }
      if (parsed.discordUserId) {
        updatePayload.discord_user_id = parsed.discordUserId
      }
      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)
      if (error) {
        return {
          success: false,
          error: `Failed to update profile: ${error.message}`,
        }
      }
    }

    // 5. UPSERT pinger_settings (always present — defaults if missing)
    {
      const { error } = await supabase.from('pinger_settings').upsert(
        {
          user_id: userId,
          is_active: parsed.pinger.isActive,
          cooldown_minutes: parsed.pinger.cooldownMinutes,
        },
        { onConflict: 'user_id' },
      )
      if (error) {
        return {
          success: false,
          error: `Failed to write Pinger settings: ${error.message}`,
        }
      }
    }

    // 6. pushover: upsert or delete
    let pushoverUpdated = false
    let pushoverRemoved = false
    if (parsed.pushover) {
      const { error } = await supabase.from('pushover_settings').upsert(
        {
          user_id: userId,
          user_key: parsed.pushover.userKey,
          priority: parsed.pushover.priority,
        },
        { onConflict: 'user_id' },
      )
      if (error) {
        return {
          success: false,
          error: `Failed to write Pushover settings: ${error.message}`,
        }
      }
      pushoverUpdated = true
    } else {
      const { error } = await supabase
        .from('pushover_settings')
        .delete()
        .eq('user_id', userId)
      if (error) {
        return {
          success: false,
          error: `Failed to remove old Pushover settings: ${error.message}`,
        }
      }
      pushoverRemoved = true
    }

    // 7. silently: upsert or delete
    let silentlyUpdated = false
    let silentlyRemoved = false
    if (parsed.silently) {
      const { error } = await supabase.from('silently_settings').upsert(
        {
          user_id: userId,
          user_key: parsed.silently.userKey,
          is_active: parsed.silently.isActive,
          min_stock: parsed.silently.minStock,
          schedule_start: parsed.silently.scheduleStart,
          schedule_end: parsed.silently.scheduleEnd,
        },
        { onConflict: 'user_id' },
      )
      if (error) {
        return {
          success: false,
          error: `Failed to write Silently settings: ${error.message}`,
        }
      }
      silentlyUpdated = true
    } else {
      const { error } = await supabase
        .from('silently_settings')
        .delete()
        .eq('user_id', userId)
      if (error) {
        return {
          success: false,
          error: `Failed to remove old Silently settings: ${error.message}`,
        }
      }
      silentlyRemoved = true
    }

    // 8. webhook: upsert or delete
    let webhookUpdated = false
    let webhookRemoved = false
    if (parsed.webhook) {
      const { error } = await supabase.from('webhook_settings').upsert(
        {
          user_id: userId,
          webhook_url: parsed.webhook.webhookUrl,
          is_active: true,
        },
        { onConflict: 'user_id' },
      )
      if (error) {
        return {
          success: false,
          error: `Failed to write webhook settings: ${error.message}`,
        }
      }
      webhookUpdated = true
    } else {
      const { error } = await supabase
        .from('webhook_settings')
        .delete()
        .eq('user_id', userId)
      if (error) {
        return {
          success: false,
          error: `Failed to remove old webhook settings: ${error.message}`,
        }
      }
      webhookRemoved = true
    }

    // 9. INSERT keywords (bulk)
    if (finalKeywords.length > 0) {
      const rows = finalKeywords.map((kw) => ({
        user_id: userId,
        keyword: kw.keyword,
        internal_name: kw.internalName,
        channel_ids: kw.channelIds,
        category_ids: kw.categoryIds,
        max_price: kw.maxPrice,
      }))
      const { error } = await supabase.from('keywords').insert(rows)
      if (error) {
        return {
          success: false,
          error: `Failed to import keywords: ${error.message}`,
        }
      }
    }

    // 10. INSERT autostart_disabled_keywords (bulk)
    if (parsed.autostartDisabledKeywords.length > 0) {
      const rows = parsed.autostartDisabledKeywords.map((keyword) => ({
        user_id: userId,
        keyword,
      }))
      const { error } = await supabase
        .from('autostart_disabled_keywords')
        .insert(rows)
      if (error) {
        return {
          success: false,
          error: `Failed to import autostart-disabled keywords: ${error.message}`,
        }
      }
    }

    // 11. Revalidate all affected pages so the dashboard reflects the new state
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/keywords')
    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard/notifications')
    revalidatePath('/dashboard/autostart')

    const summary: ImportSummary = {
      discordUserId: parsed.discordUserId,
      keywordsImported: finalKeywords.length,
      keywordsGlobal: globalKeywordCount,
      pingerUpdated: true,
      pushoverUpdated,
      pushoverRemoved,
      silentlyUpdated,
      silentlyRemoved,
      webhookUpdated,
      webhookRemoved,
      autostartDisabledKeywordsImported: parsed.autostartDisabledKeywords.length,
      warnings: parsed.issues.map((i) => i.message),
    }

    return { success: true, data: summary }
  } catch (err) {
    return {
      success: false,
      error: handleActionError(err, 'Import failed'),
    }
  }
}

/**
 * Mark the current user as onboarded without importing anything.
 * Called by the "Start without import" button on the onboarding page.
 */
export async function markOnboarded(): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()
    const supabase = await createServerClient()
    const { error } = await supabase
      .from('profiles')
      .update({ is_onboarded: true })
      .eq('id', profile.id)
    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    return {
      success: false,
      error: handleActionError(err, 'Failed to complete onboarding'),
    }
  }
}
