import { generatePkcePair, randomUrlSafe } from './pkce'
import { waitForCallback } from './callback-server'
import type { OAuthProviderConfig } from './providers'
import { saveOAuthToken, getOAuthToken, type OAuthToken } from './storage'

/**
 * In-memory map of state → PKCE verifier, keyed for the duration of a
 * single OAuth flow. State is sent to the OAuth server and returned in the
 * callback; we use it to retrieve the verifier we generated at start.
 */
const PENDING: Map<string, { verifier: string; provider: OAuthProviderConfig }> = new Map()

export interface AuthorizeStart {
  authorizeUrl: string
  state: string
  /** The port + path the one-shot server is listening on. */
  callbackPort: number
  callbackPath: string
}

/**
 * Build the authorize URL and stash the PKCE verifier keyed by state.
 * Caller should open the URL in a browser and await `waitForCallback()`
 * in a concurrent task. Call `completeAuthorize(state, code)` once the
 * callback arrives.
 */
export function beginAuthorize(provider: OAuthProviderConfig): AuthorizeStart {
  const { verifier, challenge } = generatePkcePair()
  const state = randomUrlSafe(16)
  PENDING.set(state, { verifier, provider })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: provider.clientId,
    redirect_uri: provider.redirectUri,
    scope: provider.scopes,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    ...(provider.extraAuthorizeParams || {}),
  })
  return {
    authorizeUrl: `${provider.authorizeUrl}?${params.toString()}`,
    state,
    callbackPort: provider.callbackPort,
    callbackPath: provider.callbackPath,
  }
}

/**
 * Exchange the code for tokens, persist them, and return the row.
 */
export async function completeAuthorize(
  state: string,
  code: string
): Promise<OAuthToken> {
  const pending = PENDING.get(state)
  if (!pending) throw new Error('Unknown OAuth state — start the flow again.')
  PENDING.delete(state)

  const { provider, verifier } = pending

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: provider.clientId,
    ...(provider.clientSecret ? { client_secret: provider.clientSecret } : {}),
    redirect_uri: provider.redirectUri,
    code_verifier: verifier,
    ...(provider.extraTokenParams || {}),
  })

  const res = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
  })
  const json: any = await res.json().catch(() => ({}))
  if (!res.ok || !json?.access_token) {
    const msg = json?.error_description || json?.error || res.statusText
    throw new Error(`Token exchange failed: ${msg}`)
  }

  const accountInfo = extractAccountInfo(provider.key, json)
  const expiresAt = json.expires_in
    ? new Date(Date.now() + (Number(json.expires_in) - 30) * 1000)
    : null

  return saveOAuthToken({
    provider: provider.key,
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    idToken: json.id_token ?? null,
    tokenType: json.token_type || 'Bearer',
    scope: json.scope || provider.scopes,
    accountEmail: accountInfo.email,
    accountName: accountInfo.name,
    expiresAt,
  })
}

/** Drive the full flow: spin up callback server, build URL, wait, exchange. */
export async function runAuthorize(provider: OAuthProviderConfig): Promise<{
  token: OAuthToken
  authorizeUrl: string
}> {
  const start = beginAuthorize(provider)

  // Start the callback listener BEFORE opening the browser so we don't miss
  // a fast redirect.
  const callbackPromise = waitForCallback({
    port: start.callbackPort,
    path: start.callbackPath,
  })

  // Caller is responsible for opening the browser — they have the URL.
  // We return a promise that resolves once the callback fires + we've
  // exchanged the code.
  const { code, state } = await callbackPromise
  if (state !== start.state) {
    throw new Error('OAuth state mismatch — possible CSRF, refusing to proceed.')
  }
  const token = await completeAuthorize(state, code)
  return { token, authorizeUrl: start.authorizeUrl }
}

/**
 * Refresh an access token using its refresh_token. Persists the new token.
 * Throws if the provider has no refresh token or the refresh call fails.
 */
export async function refreshToken(
  provider: OAuthProviderConfig,
  existing: OAuthToken
): Promise<OAuthToken> {
  if (!existing.refreshToken) throw new Error(`No refresh_token stored for ${provider.key}`)
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: existing.refreshToken,
    client_id: provider.clientId,
    ...(provider.clientSecret ? { client_secret: provider.clientSecret } : {}),
    ...(provider.extraTokenParams || {}),
  })
  const res = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
  })
  const json: any = await res.json().catch(() => ({}))
  if (!res.ok || !json?.access_token) {
    const msg = json?.error_description || json?.error || res.statusText
    throw new Error(`Token refresh failed: ${msg}`)
  }
  const expiresAt = json.expires_in
    ? new Date(Date.now() + (Number(json.expires_in) - 30) * 1000)
    : null

  return saveOAuthToken({
    provider: provider.key,
    accessToken: json.access_token,
    // Google + OpenAI usually don't return a new refresh_token; keep the old one.
    refreshToken: json.refresh_token ?? existing.refreshToken,
    idToken: json.id_token ?? existing.idToken,
    tokenType: json.token_type || existing.tokenType,
    scope: json.scope || existing.scope,
    accountEmail: existing.accountEmail,
    accountName: existing.accountName,
    expiresAt,
  })
}

/**
 * Parse an ID token (JWT) if present to get the user's email + name.
 * Fails open — if anything looks off we just return nulls.
 */
function extractAccountInfo(
  _key: string,
  tokenResp: any
): { email: string | null; name: string | null } {
  const idToken: string | undefined = tokenResp?.id_token
  if (!idToken) return { email: null, name: null }
  try {
    const parts = idToken.split('.')
    if (parts.length < 2) return { email: null, name: null }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
    return {
      email: payload?.email ?? null,
      name: payload?.name ?? payload?.given_name ?? null,
    }
  } catch {
    return { email: null, name: null }
  }
}

/**
 * Return a valid access token for a provider, refreshing on the fly if it's
 * about to expire. Returns null if no token is stored.
 */
export async function getValidAccessToken(
  provider: OAuthProviderConfig
): Promise<OAuthToken | null> {
  const existing = getOAuthToken(provider.key)
  if (!existing) return null
  if (!existing.expiresAt) return existing
  const expMs = new Date(existing.expiresAt).getTime()
  // Refresh 2 minutes before expiry.
  if (expMs - Date.now() > 2 * 60 * 1000) return existing
  if (!existing.refreshToken) return existing // nothing we can do; let call fail normally
  try {
    return await refreshToken(provider, existing)
  } catch {
    return existing // return stale; the downstream call will fail & prompt re-login
  }
}
