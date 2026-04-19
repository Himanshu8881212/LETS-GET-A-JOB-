/**
 * OAuth provider configuration.
 *
 * Only OpenAI is supported. Google Gemini OAuth was attempted and removed —
 * the Gemini CLI OAuth client_id is whitelisted only for Google's private
 * Code Assist API (cloudcode-pa.googleapis.com), not the public Gemini API.
 * Requesting public Gemini API scopes is rejected with "restricted_client"
 * by Google's OAuth server. For Gemini access, users should use OpenRouter
 * (one key, all models — including every Gemini variant).
 */

import type { OAuthProvider } from './storage'

export interface OAuthProviderConfig {
  key: OAuthProvider
  displayName: string
  authorizeUrl: string
  tokenUrl: string
  clientId: string
  /** Some flows (Google installed apps) need a client_secret — not actually secret, embedded in the CLI distribution. */
  clientSecret?: string
  /** Space-separated scopes. */
  scopes: string
  /** Exact redirect_uri registered with the OAuth client — must match. */
  redirectUri: string
  /** Local port the temp callback server listens on. */
  callbackPort: number
  /** Path on that local server the OAuth server redirects to. */
  callbackPath: string
  /** Extra query params sent to the authorize endpoint. */
  extraAuthorizeParams?: Record<string, string>
  /** Extra form fields sent to the token endpoint. */
  extraTokenParams?: Record<string, string>
  /** Optional warning surfaced in the UI + logs. */
  warning?: string
}

export const OPENAI_CODEX: OAuthProviderConfig = {
  key: 'openai_codex',
  displayName: 'ChatGPT (OpenAI Codex OAuth)',
  authorizeUrl: 'https://auth.openai.com/oauth/authorize',
  tokenUrl: 'https://auth.openai.com/oauth/token',
  clientId: 'app_EMoamEEZ73f0CkXaXp7hrann',
  // These are exactly the scopes the Codex CLI requests. Additional scopes
  // like api.model.read are rejected with "OAuth Client is not allowed to
  // request scope" — they grant inference, not enumeration.
  scopes: 'openid profile email offline_access api.connectors.read api.connectors.invoke',
  redirectUri: 'http://localhost:1455/auth/callback',
  callbackPort: 1455,
  callbackPath: '/auth/callback',
  extraAuthorizeParams: {
    id_token_add_organizations: 'true',
    codex_cli_simplified_flow: 'true',
  },
}

export const PROVIDERS: Record<OAuthProvider, OAuthProviderConfig> = {
  openai_codex: OPENAI_CODEX,
}

export function getProvider(key: string): OAuthProviderConfig | null {
  return (PROVIDERS as Record<string, OAuthProviderConfig>)[key] || null
}
