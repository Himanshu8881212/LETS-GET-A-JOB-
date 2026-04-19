import { getDatabase } from '@/lib/db'
import { encryptSecret, maybeDecrypt } from '@/lib/crypto/secrets'

export type OAuthProvider = 'openai_codex'

export interface OAuthToken {
  id: number
  provider: OAuthProvider
  accessToken: string
  refreshToken: string | null
  idToken: string | null
  tokenType: string
  scope: string | null
  accountEmail: string | null
  accountName: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

interface Row {
  id: number
  provider: string
  access_token: string
  refresh_token: string | null
  id_token: string | null
  token_type: string | null
  scope: string | null
  account_email: string | null
  account_name: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

function toToken(r: Row): OAuthToken {
  return {
    id: r.id,
    provider: r.provider as OAuthProvider,
    accessToken: maybeDecrypt(r.access_token),
    refreshToken: r.refresh_token ? maybeDecrypt(r.refresh_token) : null,
    idToken: r.id_token ? maybeDecrypt(r.id_token) : null,
    tokenType: r.token_type || 'Bearer',
    scope: r.scope,
    accountEmail: r.account_email,
    accountName: r.account_name,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export interface SaveInput {
  provider: OAuthProvider
  accessToken: string
  refreshToken?: string | null
  idToken?: string | null
  tokenType?: string
  scope?: string | null
  accountEmail?: string | null
  accountName?: string | null
  expiresAt?: Date | null
}

export function saveOAuthToken(input: SaveInput): OAuthToken {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO oauth_tokens
      (provider, access_token, refresh_token, id_token, token_type, scope, account_email, account_name, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, oauth_tokens.refresh_token),
      id_token = excluded.id_token,
      token_type = excluded.token_type,
      scope = excluded.scope,
      account_email = COALESCE(excluded.account_email, oauth_tokens.account_email),
      account_name = COALESCE(excluded.account_name, oauth_tokens.account_name),
      expires_at = excluded.expires_at,
      updated_at = CURRENT_TIMESTAMP
  `)
  stmt.run(
    input.provider,
    encryptSecret(input.accessToken),
    input.refreshToken ? encryptSecret(input.refreshToken) : null,
    input.idToken ? encryptSecret(input.idToken) : null,
    input.tokenType ?? 'Bearer',
    input.scope ?? null,
    input.accountEmail ?? null,
    input.accountName ?? null,
    input.expiresAt ? input.expiresAt.toISOString() : null,
  )
  return getOAuthToken(input.provider)!
}

export function getOAuthToken(provider: OAuthProvider): OAuthToken | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM oauth_tokens WHERE provider = ?').get(provider) as Row | undefined
  return row ? toToken(row) : null
}

export function deleteOAuthToken(provider: OAuthProvider): boolean {
  const db = getDatabase()
  const info = db.prepare('DELETE FROM oauth_tokens WHERE provider = ?').run(provider)
  return info.changes > 0
}

export function listOAuthTokens(): OAuthToken[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM oauth_tokens ORDER BY provider').all() as Row[]
  return rows.map(toToken)
}

/** Token is "close to expiry" if it expires in the next 2 minutes (or already has). */
export function isExpiring(token: OAuthToken, now = new Date()): boolean {
  if (!token.expiresAt) return false
  const exp = new Date(token.expiresAt).getTime()
  return exp - now.getTime() < 2 * 60 * 1000
}
