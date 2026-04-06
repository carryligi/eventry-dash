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

    // 1. Exchange code for tokens
    console.log('[auth] Step 1: Exchanging code for tokens...')
    const callbackUri = `${origin}/auth/callback`
    const tokens = await exchangeCodeForTokens(code, codeVerifier, callbackUri)
    console.log('[auth] Step 1: Token exchange successful')

    // 2. Get user info
    console.log('[auth] Step 2: Fetching user info...')
    const whopUser = await getWhopUser(tokens.access_token)
    console.log(`[auth] Step 2: Got user ${whopUser.id} (${whopUser.username})`)

    // 3. Check company membership
    console.log('[auth] Step 3: Checking access...')
    const access = await checkCompanyAccess(tokens.access_token)
    console.log(`[auth] Step 3: Access check result: has_access=${access.has_access}, level=${access.access_level}`)

    if (!access.has_access) {
      return NextResponse.redirect(`${origin}/auth/no-access`)
    }

    // 4. Upsert profile in database
    console.log('[auth] Step 4: Upserting profile...')
    const supabase = await createServerClient()
    const userId = whopUser.id

    const displayName = whopUser.username || whopUser.email?.split('@')[0] || 'User'
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      whop_user_id: whopUser.id,
      discord_username: displayName,
      username: displayName,
      email: whopUser.email,
      avatar_url: whopUser.profile_pic_url,
      membership_status: 'active',
    }, { onConflict: 'id' })

    if (profileError) {
      console.error('[auth] Step 4: Profile upsert failed:', profileError)
      return NextResponse.redirect(`${origin}/?error=profile_setup_failed`)
    }

    // Initialize pinger settings for new users
    await supabase.from('pinger_settings').upsert(
      { user_id: userId, is_active: false, cooldown_minutes: 0 },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
    console.log('[auth] Step 4: Profile upserted')

    // 5. Create session
    console.log('[auth] Step 5: Creating session...')
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
    console.log('[auth] Step 5: Session created')

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
    console.error('[auth] FAILED:', err instanceof Error ? err.message : err)
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }
}
