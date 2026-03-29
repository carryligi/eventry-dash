import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()

    // Create a fresh Supabase client that can set cookies on the response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing sessions.
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      const meta = data.session.user.user_metadata

      // Upsert profile from Discord metadata
      try {
        await supabase.from('profiles').upsert({
          id: meta.provider_id,
          discord_username: meta.full_name || meta.name || 'Unknown',
          discord_avatar: meta.avatar_url || null,
        }, { onConflict: 'id' })

        // Initialize default pinger settings if first login
        await supabase.from('pinger_settings').upsert(
          { user_id: meta.provider_id, is_active: false, cooldown_minutes: 0 },
          { onConflict: 'user_id', ignoreDuplicates: true }
        )
      } catch (e) {
        console.error('Profile upsert error:', e)
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Auth error — redirect to home with error
  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}
