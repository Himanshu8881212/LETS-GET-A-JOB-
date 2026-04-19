import { NextResponse } from 'next/server'
import { listModels } from '@/lib/llm/list-models'
import { readSetting } from '@/lib/db/settings'
import type { ProviderKind } from '@/lib/llm/types'
import { getValidAccessToken } from '@/lib/oauth/flow'
import { OPENAI_CODEX, getProvider as getOAuthProvider } from '@/lib/oauth/providers'

export const runtime = 'nodejs'
export const maxDuration = 20

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const kind = body.provider as ProviderKind | undefined
  const baseUrl = body.baseUrl as string | undefined
  let apiKey = body.apiKey as string | undefined
  let authMode: 'auto' | 'bearer' | undefined

  if (!kind) return NextResponse.json({ error: 'provider is required' }, { status: 400 })
  if (!['openai-compatible', 'anthropic', 'google'].includes(kind)) {
    return NextResponse.json({ error: 'invalid provider kind' }, { status: 400 })
  }

  // OAuth path — client tells us "use this OAuth provider's token".
  // Look up the stored token (refreshing if close to expiry) and use it
  // as the credential for the provider's /models endpoint.
  const oauthKey = typeof body.oauth === 'string' ? body.oauth : ''
  if (oauthKey) {
    const provider = getOAuthProvider(oauthKey)
    if (!provider) {
      return NextResponse.json({ error: `Unknown OAuth provider: ${oauthKey}` }, { status: 400 })
    }
    if (oauthKey !== 'openai_codex') {
      return NextResponse.json({ error: `OAuth provider ${oauthKey} is not supported` }, { status: 400 })
    }
    const token = await getValidAccessToken(OPENAI_CODEX)
    if (!token) {
      return NextResponse.json({ error: 'Not signed in to ' + oauthKey }, { status: 401 })
    }
    apiKey = token.accessToken
    if (kind === 'google') authMode = 'bearer'
  }

  // Local services (Ollama / LM Studio) don't need a real key.
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(baseUrl || '')
  if (isLocal && !apiKey) apiKey = 'ollama'

  if (!apiKey || (typeof apiKey === 'string' && apiKey.includes('*'))) {
    const featureKey = typeof body.feature === 'string' ? body.feature : 'default'
    apiKey =
      readSetting(`llm.${featureKey}.apiKey`) ||
      readSetting('llm.default.apiKey') ||
      process.env.LLM_API_KEY ||
      ''
  }
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key or OAuth token available' }, { status: 400 })
  }

  try {
    const models = await listModels({ kind, apiKey, baseUrl, model: '', authMode })
    return NextResponse.json({ models })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to list models', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}
