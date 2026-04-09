'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { discordUserIdSchema } from '@/lib/validations'
import { handleActionError } from '@/lib/action-utils'
import type { ActionResult } from '@/types'

/**
 * Update the current user's Discord User ID. Empty string clears the mapping.
 * The Python bot needs this to translate whop_user_id -> discord snowflake
 * for DMs, guild membership checks, and silently autostart.
 */
export async function updateDiscordUserId(discordUserId: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentUser()

    const parsed = discordUserIdSchema.safeParse({ discord_user_id: discordUserId })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const value = parsed.data.discord_user_id.trim()
    const supabase = await createServerClient()

    const { error } = await supabase
      .from('profiles')
      .update({ discord_user_id: value === '' ? null : value })
      .eq('id', profile.id)

    if (error) {
      // Unique constraint violation — someone else already has this Discord ID
      if (error.code === '23505') {
        return {
          success: false,
          error: 'This Discord User ID is already assigned to another account',
        }
      }
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: handleActionError(err, 'Failed to save Discord User ID') }
  }
}
