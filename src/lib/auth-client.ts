export function loginWithWhop() {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_WHOP_CLIENT_ID!,
    redirect_uri: `${window.location.origin}/auth/callback`,
    response_type: 'code',
    scope: 'openid profile email',
    state: crypto.randomUUID(),
  })
  window.location.href = `https://api.whop.com/oauth/authorize?${params.toString()}`
}
