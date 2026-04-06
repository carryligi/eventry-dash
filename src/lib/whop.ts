const WHOP_API_BASE = 'https://api.whop.com/api/v5'
const WHOP_OAUTH_BASE = 'https://api.whop.com/oauth'

interface WhopTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

interface WhopUser {
  id: string
  username: string | null
  email: string | null
  profile_pic_url: string | null
}

interface WhopAccessCheck {
  has_access: boolean
  access_level: 'customer' | 'admin' | 'no_access'
}

export function getWhopAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_WHOP_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_WHOP_REDIRECT_URI ?? 'http://localhost:3000/auth/callback'}`,
    response_type: 'code',
    state,
    scope: 'openid profile email',
  })
  return `${WHOP_OAUTH_BASE}/authorize?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string, codeVerifier?: string, redirectUri?: string): Promise<WhopTokenResponse> {
  const body: Record<string, string> = {
    client_id: process.env.NEXT_PUBLIC_WHOP_CLIENT_ID!,
    client_secret: process.env.WHOP_CLIENT_SECRET!,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri ?? process.env.NEXT_PUBLIC_WHOP_REDIRECT_URI ?? 'http://localhost:3000/auth/callback',
  }
  if (codeVerifier) {
    body.code_verifier = codeVerifier
  }
  const res = await fetch(`${WHOP_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Whop token exchange failed: ${error}`)
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

export async function getWhopUser(accessToken: string): Promise<WhopUser> {
  const res = await fetch(`${WHOP_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error('Failed to fetch Whop user')
  }

  return res.json()
}

export async function checkCompanyAccess(accessToken: string): Promise<WhopAccessCheck> {
  const companyId = process.env.WHOP_COMPANY_ID!
  const res = await fetch(`${WHOP_API_BASE}/me/has_access/${companyId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    return { has_access: false, access_level: 'no_access' }
  }

  return res.json()
}
