async function generatePKCE() {
  const verifier = crypto.randomUUID() + crypto.randomUUID()
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return { verifier, challenge }
}

export async function loginWithWhop() {
  const { verifier, challenge } = await generatePKCE()
  const state = crypto.randomUUID()
  const nonce = crypto.randomUUID()

  // Store verifier in cookie so the server callback can read it
  document.cookie = `whop_code_verifier=${verifier}; path=/; max-age=600; SameSite=Lax`
  document.cookie = `whop_oauth_state=${state}; path=/; max-age=600; SameSite=Lax`

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_WHOP_CLIENT_ID!,
    redirect_uri: `${window.location.origin}/auth/callback`,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  window.location.href = `https://api.whop.com/oauth/authorize?${params.toString()}`
}
