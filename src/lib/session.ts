import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { refreshAccessToken } from '@/lib/whop'

const SESSION_COOKIE = 'whop_session'
const ACCESS_TOKEN_COOKIE = 'whop_access_token'
const REFRESH_TOKEN_COOKIE = 'whop_refresh_token'

interface SessionData {
  userId: string
  username: string | null
  email: string | null
  avatarUrl: string | null
  accessLevel: string
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
}

// ---------------------------------------------------------------------------
// Session signing (HMAC-SHA256)
//
// The session cookie is a tamper-proof, HMAC-signed token in the format
//   <base64url(JSON(payload))>.<base64url(HMAC-SHA256(secret, encodedPayload))>
//
// Signing (not encryption) is sufficient here: the payload only contains
// identity data that the user can already see in the UI — we just need to
// guarantee the server-trusted `userId` and `accessLevel` weren't forged or
// modified by the client.
//
// Requires the SESSION_SECRET env var (>= 32 chars). Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
// ---------------------------------------------------------------------------

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET env var is missing or shorter than 32 chars. ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"',
    )
  }
  return secret
}

function hmac(payload: string): string {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('base64url')
}

function signPayload(encodedPayload: string): string {
  return `${encodedPayload}.${hmac(encodedPayload)}`
}

/**
 * Verify a signed session token. Returns the encoded payload on success, or
 * null if the token is malformed or the signature does not match. Throws only
 * if SESSION_SECRET is unconfigured — that is a deploy-time error and should
 * surface loudly rather than silently log everyone out.
 */
function verifySignedToken(token: string): string | null {
  const lastDot = token.lastIndexOf('.')
  if (lastDot === -1) return null

  const encodedPayload = token.slice(0, lastDot)
  const providedSig = token.slice(lastDot + 1)
  if (!encodedPayload || !providedSig) return null

  // Will throw if SESSION_SECRET is unconfigured.
  const expectedSig = hmac(encodedPayload)

  let providedBuf: Buffer
  let expectedBuf: Buffer
  try {
    providedBuf = Buffer.from(providedSig, 'base64url')
    expectedBuf = Buffer.from(expectedSig, 'base64url')
  } catch {
    return null
  }

  if (providedBuf.length === 0 || providedBuf.length !== expectedBuf.length) {
    return null
  }
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null

  return encodedPayload
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function createSession(
  sessionData: SessionData,
  accessToken: string,
  refreshToken: string,
) {
  const cookieStore = await cookies()

  const encodedPayload = Buffer.from(JSON.stringify(sessionData)).toString(
    'base64url',
  )
  const signed = signPayload(encodedPayload)

  cookieStore.set(SESSION_COOKIE, signed, COOKIE_OPTIONS)
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 60 * 55, // 55 minutes (token expires in 60)
  })
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS)
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE)

  if (!sessionCookie?.value) return null

  const encodedPayload = verifySignedToken(sessionCookie.value)
  if (!encodedPayload) return null

  try {
    const decoded = Buffer.from(encodedPayload, 'base64url').toString('utf8')
    return JSON.parse(decoded) as SessionData
  } catch {
    return null
  }
}

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies()

  // Try current access token
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)
  if (accessToken?.value) return accessToken.value

  // Try refreshing with refresh token
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)
  if (!refreshToken?.value) return null

  try {
    const tokens = await refreshAccessToken(refreshToken.value)

    cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 55,
    })
    cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, COOKIE_OPTIONS)

    return tokens.access_token
  } catch {
    // Refresh failed — session is dead
    await destroySession()
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  cookieStore.delete(ACCESS_TOKEN_COOKIE)
  cookieStore.delete(REFRESH_TOKEN_COOKIE)
}
