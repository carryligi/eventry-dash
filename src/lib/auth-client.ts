import { createClient } from '@/lib/supabase/client'

export async function loginWithDiscord() {
  const supabase = createClient()
  await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}
