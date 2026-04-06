import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForTokens, getWhopUser, checkCompanyAccess } from '@/lib/whop'
import { createSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('Whop OAuth error:', error)
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=no_code`)
  }

  try {
    // Read PKCE code_verifier from cookie
    const cookieStore = await cookies()
    const codeVerifier = cookieStore.get('whop_code_verifier')?.value

    // 1. Exchange code for tokens (redirect_uri must match what the client sent)
    const callbackUri = `${origin}/auth/callback`
    const tokens = await exchangeCodeForTokens(code, codeVerifier, callbackUri)

    // 2. Get user info
    const whopUser = await getWhopUser(tokens.access_token)

    // 3. Check company membership
    const access = await checkCompanyAccess(tokens.access_token)

    if (!access.has_access) {
      return NextResponse.redirect(`${origin}/auth/no-access`)
    }

    // 4. Upsert profile in database
    const supabase = await createServerClient()
    const userId = whopUser.id

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      whop_user_id: whopUser.id,
      username: whopUser.username || whopUser.email?.split('@')[0] || 'User',
      email: whopUser.email,
      avatar_url: whopUser.profile_pic_url,
      membership_status: 'active',
    }, { onConflict: 'id' })

    if (profileError) {
      console.error('Profile upsert failed:', profileError)
      return NextResponse.redirect(`${origin}/?error=profile_setup_failed`)
    }

    // Initialize pinger settings for new users
    await supabase.from('pinger_settings').upsert(
      { user_id: userId, is_active: false, cooldown_minutes: 0 },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )

    // 5. Create session
    await createSession(
      {
        userId,
        username: whopUser.username,
        email: whopUser.email,
        avatarUrl: whopUser.profile_pic_url,
        accessLevel: access.access_level,
      },
      tokens.access_token,
      tokens.refresh_token,
    )

    // 6. Redirect to dashboard (clean up PKCE cookies)
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'

    let redirectUrl: string
    if (isLocalEnv) {
      redirectUrl = `${origin}/dashboard`
    } else if (forwardedHost) {
      redirectUrl = `https://${forwardedHost}/dashboard`
    } else {
      redirectUrl = `${origin}/dashboard`
    }

    const response = NextResponse.redirect(redirectUrl)
    response.cookies.delete('whop_code_verifier')
    response.cookies.delete('whop_oauth_state')
    return response
  } catch (err) {
    console.error('Whop auth failed:', err)
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }
}
