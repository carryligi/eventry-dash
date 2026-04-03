import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()

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
              // Ignored in Server Component context — middleware handles session refresh
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      const meta = data.session.user.user_metadata

      const [profileResult] = await Promise.all([
        supabase.from('profiles').upsert({
          id: meta.provider_id,
          discord_username: meta.full_name || meta.name || 'Unknown',
          discord_avatar: meta.avatar_url || null,
        }, { onConflict: 'id' }),
        supabase.from('pinger_settings').upsert(
          { user_id: meta.provider_id, is_active: false, cooldown_minutes: 0 },
          { onConflict: 'user_id', ignoreDuplicates: true }
        ),
      ])

      if (profileResult.error) {
        console.error('Profile upsert failed:', profileResult.error)
        return NextResponse.redirect(`${origin}/?error=profile_setup_failed`)
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

    // Auth exchange failed — log for debugging
    console.error('Auth exchange failed:', error?.message)
  }

  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}
