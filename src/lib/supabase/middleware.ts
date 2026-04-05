import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE = 'whop_session'

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)

  // No session cookie → redirect to landing
  if (request.nextUrl.pathname.startsWith('/dashboard') && !session?.value) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}
