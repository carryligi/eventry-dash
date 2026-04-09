import { createServerClient } from '@/lib/supabase/server'

/**
 * Counts the user's existing keywords/settings to power the
 * "Replace all" warning banner in the import preview.
 */
export async function getExistingDataCounts(userId: string) {
  const supabase = await createServerClient()

  const [keywordsRes, pushoverRes, silentlyRes, webhookRes] = await Promise.all([
    supabase
      .from('keywords')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('pushover_settings')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('silently_settings')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('webhook_settings')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  return {
    keywords: keywordsRes.count ?? 0,
    hasPushover: (pushoverRes.count ?? 0) > 0,
    hasSilently: (silentlyRes.count ?? 0) > 0,
    hasWebhook: (webhookRes.count ?? 0) > 0,
  }
}
