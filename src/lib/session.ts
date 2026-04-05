import { cookies } from 'next/headers'
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

export async function createSession(
  sessionData: SessionData,
  accessToken: string,
  refreshToken: string,
) {
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE, JSON.stringify(sessionData), COOKIE_OPTIONS)
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

  try {
    return JSON.parse(sessionCookie.value) as SessionData
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
