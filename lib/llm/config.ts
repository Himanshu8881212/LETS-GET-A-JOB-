import type { EmbeddingsConfig, EmbeddingsKind, FeatureName, ProviderConfig, ProviderKind } from './types'
import { readAllSettings } from '@/lib/db/settings'
import { getValidAccessToken } from '@/lib/oauth/flow'
import { OPENAI_CODEX } from '@/lib/oauth/providers'
import { getOAuthToken } from '@/lib/oauth/storage'

/**
 * Resolve provider config for a feature.
 *
 * Priority per field (provider, model, apiKey, baseUrl):
 *   1. DB override for this feature (settings key llm.<feature>.<field>)
 *   2. DB "agent" slot (settings key llm.agent.<field>)  — the unified slot
 *   3. DB default (settings key llm.default.<field>)     — legacy
 *   4. Env override for this feature (LLM_<FEATURE>_<FIELD>)
 *   5. Env default (LLM_<FIELD>)
 *
 * The "agent" slot is the new unified slot — one model powers everything.
 * We keep "default" for backward compatibility with older installs.
 */

const FEATURE_ENV_PREFIX: Record<Exclude<FeatureName, 'default' | 'agent'>, string> = {
  parseJd: 'LLM_PARSE_JD',
  parseResume: 'LLM_PARSE_RESUME',
  parseCoverLetter: 'LLM_PARSE_COVER_LETTER',
  generateResume: 'LLM_GENERATE_RESUME',
  generateCoverLetter: 'LLM_GENERATE_COVER_LETTER',
  evaluateAts: 'LLM_EVAL',
  scoutChat: 'LLM_SCOUT',
}

const FEATURE_DB_KEY: Record<Exclude<FeatureName, 'default' | 'agent'>, string> = {
  parseJd: 'parseJd',
  parseResume: 'parseResume',
  parseCoverLetter: 'parseCoverLetter',
  generateResume: 'generateResume',
  generateCoverLetter: 'generateCoverLetter',
  evaluateAts: 'evaluateAts',
  scoutChat: 'scoutChat',
}

function parseKind(raw: string | undefined, context: string): ProviderKind {
  if (!raw) throw new Error(`Missing provider kind for ${context}`)
  if (raw === 'openai-compatible' || raw === 'anthropic' || raw === 'google') return raw
  throw new Error(`Invalid provider kind "${raw}" for ${context} (allowed: openai-compatible, anthropic, google)`)
}

function defaultBaseUrl(kind: ProviderKind): string | undefined {
  if (kind === 'openai-compatible') return 'https://api.openai.com/v1'
  return undefined
}

function readDb(): Record<string, string> {
  try {
    return readAllSettings()
  } catch {
    return {}
  }
}

/**
 * Walks the fallback chain for a single field. Returns the first non-empty value.
 * Chain: feature DB → agent DB → default DB → feature env → default env.
 */
function pickField(
  db: Record<string, string>,
  featureKey: string | null,
  featureEnvPrefix: string | null,
  field: 'provider' | 'model' | 'apiKey' | 'baseUrl'
): string | undefined {
  const envField: 'PROVIDER' | 'MODEL' | 'API_KEY' | 'BASE_URL' =
    field === 'provider' ? 'PROVIDER' : field === 'model' ? 'MODEL' : field === 'apiKey' ? 'API_KEY' : 'BASE_URL'

  if (featureKey) {
    const v = db[`llm.${featureKey}.${field}`]
    if (v) return v
  }
  const agent = db[`llm.agent.${field}`]
  if (agent) return agent
  const def = db[`llm.default.${field}`]
  if (def) return def
  if (featureEnvPrefix) {
    const ev = process.env[`${featureEnvPrefix}_${envField}`]
    if (ev) return ev
  }
  const envDef = process.env[`LLM_${envField}`]
  if (envDef) return envDef
  return undefined
}

/**
 * Look up the OAuth token that should power this feature. We identify the
 * configured OAuth provider by a settings marker (llm.agent.oauth) — the UI
 * sets this when the user signs in. Falls back to API key resolution if
 * no OAuth is configured.
 */
function getOAuthHandle(db: Record<string, string>, featureKey: string | null): 'openai_codex' | null {
  const key = featureKey
    ? (db[`llm.${featureKey}.oauth`] || db['llm.agent.oauth'] || db['llm.default.oauth'])
    : (db['llm.agent.oauth'] || db['llm.default.oauth'])
  if (key === 'openai_codex') return key
  return null
}

export function getProviderConfig(feature: FeatureName = 'agent'): ProviderConfig {
  const db = readDb()
  const isNamedFeature = feature !== 'default' && feature !== 'agent'
  const featureDbKey = isNamedFeature ? FEATURE_DB_KEY[feature as Exclude<FeatureName, 'default' | 'agent'>] : null
  const featureEnvPrefix = isNamedFeature ? FEATURE_ENV_PREFIX[feature as Exclude<FeatureName, 'default' | 'agent'>] : null

  // OAuth takes precedence if configured. If the OAuth marker is set but
  // there's no token (e.g. user signed out, tokens were wiped, expired),
  // throw a clear error so callers know to prompt the user to sign in —
  // rather than silently falling through to the API-key path (which would
  // pick up a stale key and send it to the wrong provider, causing 401s).
  const oauthHandle = getOAuthHandle(db, featureDbKey)
  if (oauthHandle === 'openai_codex') {
    const token = getOAuthToken('openai_codex')
    if (!token) {
      throw new Error(
        'Signed out of ChatGPT OAuth. Open Settings and sign in again, or switch to a different service.'
      )
    }
    return {
      kind: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: token.accessToken,
      model:
        pickField(db, featureDbKey, featureEnvPrefix, 'model') ||
        'gpt-5',
    }
  }
  const rawKind = pickField(db, featureDbKey, featureEnvPrefix, 'provider')
  const kind = parseKind(rawKind, feature)

  const model = pickField(db, featureDbKey, featureEnvPrefix, 'model')
  if (!model) throw new Error(`No model configured for ${feature}. Set the agent model in Settings.`)

  const apiKey = pickField(db, featureDbKey, featureEnvPrefix, 'apiKey')
  if (!apiKey) throw new Error(`No API key configured for ${feature}. Set the agent key in Settings.`)

  const baseUrl = pickField(db, featureDbKey, featureEnvPrefix, 'baseUrl') ?? defaultBaseUrl(kind)

  return { kind, baseUrl, apiKey, model }
}

/**
 * Async variant that refreshes OAuth tokens when they're close to expiry.
 * Services that make real network calls should prefer this over the sync
 * `getProviderConfig` so they don't send a 401.
 */
export async function getProviderConfigFresh(feature: FeatureName = 'agent'): Promise<ProviderConfig> {
  const db = readDb()
  const oauthHandle = getOAuthHandle(db, null)
  if (oauthHandle === 'openai_codex') {
    const token = await getValidAccessToken(OPENAI_CODEX)
    if (token) {
      return {
        kind: 'openai-compatible',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: token.accessToken,
        model: pickField(db, null, null, 'model') || 'gpt-5',
      }
    }
  }
  return getProviderConfig(feature)
}

// ─────────────────────────────────────────────────────────────────────────
// Embeddings config — read from `embeddings.*` keys.
// ─────────────────────────────────────────────────────────────────────────

function parseEmbeddingsKind(raw: string | undefined): EmbeddingsKind {
  if (!raw) return 'ollama'
  if (raw === 'ollama' || raw === 'openai-compatible') return raw
  throw new Error(`Invalid embeddings kind "${raw}" (allowed: ollama, openai-compatible)`)
}

/**
 * Resolve embeddings config. Defaults to a local Ollama server with
 * `nomic-embed-text` so the memory system works out-of-the-box for
 * anyone who has Ollama running.
 */
export function getEmbeddingsConfig(): EmbeddingsConfig {
  const db = readDb()
  const kind = parseEmbeddingsKind(db['embeddings.provider'] || process.env.EMBEDDINGS_PROVIDER)

  const baseUrl =
    db['embeddings.baseUrl'] ||
    process.env.EMBEDDINGS_BASE_URL ||
    (kind === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com/v1')

  const apiKey = db['embeddings.apiKey'] || process.env.EMBEDDINGS_API_KEY || (kind === 'ollama' ? 'ollama' : '')

  const model =
    db['embeddings.model'] ||
    process.env.EMBEDDINGS_MODEL ||
    (kind === 'ollama' ? 'nomic-embed-text' : 'text-embedding-3-small')

  return { kind, baseUrl, apiKey, model }
}

export function hasEmbeddingsConfigured(): boolean {
  try {
    const cfg = getEmbeddingsConfig()
    return !!(cfg.baseUrl && cfg.model)
  } catch {
    return false
  }
}
