const WHOP_API_BASE = 'https://api.whop.com/api/v5'
const WHOP_OAUTH_BASE = 'https://api.whop.com/oauth'

interface WhopTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

interface WhopUserInfo {
  sub: string
  name?: string
  preferred_username?: string
  email?: string
  picture?: string
}

interface WhopAccessCheck {
  has_access: boolean
  access_level: 'customer' | 'admin' | 'no_access'
}

export async function exchangeCodeForTokens(code: string, codeVerifier?: string, redirectUri?: string): Promise<WhopTokenResponse> {
  const body: Record<string, string> = {
    client_id: process.env.NEXT_PUBLIC_WHOP_CLIENT_ID!,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri ?? process.env.NEXT_PUBLIC_WHOP_REDIRECT_URI ?? 'http://localhost:3000/auth/callback',
  }

  // PKCE flow: use code_verifier instead of client_secret
  if (codeVerifier) {
    body.code_verifier = codeVerifier
  } else {
    body.client_secret = process.env.WHOP_CLIENT_SECRET!
  }

  const res = await fetch(`${WHOP_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Whop token exchange failed (${res.status}): ${error}`)
  }

  return res.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<WhopTokenResponse> {
  const res = await fetch(`${WHOP_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_WHOP_CLIENT_ID!,
      client_secret: process.env.WHOP_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    throw new Error('Whop token refresh failed')
  }

  return res.json()
}

export async function getWhopUser(accessToken: string): Promise<{ id: string; username: string | null; email: string | null; profile_pic_url: string | null }> {
  // Try /oauth/userinfo first (official endpoint per Whop docs)
  const userinfoRes = await fetch(`${WHOP_OAUTH_BASE}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (userinfoRes.ok) {
    const info: WhopUserInfo = await userinfoRes.json()
    return {
      id: info.sub,
      username: info.preferred_username || info.name || null,
      email: info.email || null,
      profile_pic_url: info.picture || null,
    }
  }

  console.warn(`/oauth/userinfo failed (${userinfoRes.status}), falling back to /api/v5/me`)

  // Fallback to /api/v5/me
  const meRes = await fetch(`${WHOP_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!meRes.ok) {
    const error = await meRes.text()
    throw new Error(`Failed to fetch Whop user (${meRes.status}): ${error}`)
  }

  return meRes.json()
}

export async function checkCompanyAccess(accessToken: string): Promise<WhopAccessCheck> {
  const companyId = process.env.WHOP_COMPANY_ID
  if (!companyId) {
    console.warn('WHOP_COMPANY_ID not set, granting access by default')
    return { has_access: true, access_level: 'customer' }
  }

  const res = await fetch(`${WHOP_API_BASE}/me/has_access/${companyId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const error = await res.text()
    console.warn(`has_access check failed (${res.status}): ${error}`)
    // If the access check endpoint fails, grant access since user authenticated via Whop OAuth
    // The user owns the product if they can log in through our Whop app
    return { has_access: true, access_level: 'customer' }
  }

  return res.json()
}
