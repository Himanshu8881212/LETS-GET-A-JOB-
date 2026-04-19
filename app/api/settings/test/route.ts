import { NextResponse } from 'next/server'
import { OpenAICompatibleProvider } from '@/lib/llm/providers/openai-compatible'
import { AnthropicProvider } from '@/lib/llm/providers/anthropic'
import { GoogleProvider } from '@/lib/llm/providers/google'
import type { LLMProvider, ProviderConfig, ProviderKind } from '@/lib/llm/types'
import { readSetting } from '@/lib/db/settings'

export const runtime = 'nodejs'
export const maxDuration = 30

function instantiate(cfg: ProviderConfig): LLMProvider {
  switch (cfg.kind) {
    case 'openai-compatible': return new OpenAICompatibleProvider(cfg)
    case 'anthropic': return new AnthropicProvider(cfg)
    case 'google': return new GoogleProvider(cfg)
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const kind = body.provider as ProviderKind | undefined
  const model = body.model as string | undefined
  const baseUrl = body.baseUrl as string | undefined
  let apiKey = body.apiKey as string | undefined

  if (!kind || !model) {
    return NextResponse.json({ error: 'provider and model are required' }, { status: 400 })
  }
  if (!['openai-compatible', 'anthropic', 'google'].includes(kind)) {
    return NextResponse.json({ error: 'invalid provider kind' }, { status: 400 })
  }

  // If apiKey is omitted or masked, fall back to the saved key for this feature/default
  if (!apiKey || apiKey.includes('*')) {
    const featureKey = typeof body.feature === 'string' ? body.feature : 'default'
    apiKey = readSetting(`llm.${featureKey}.apiKey`) || readSetting('llm.default.apiKey') || process.env.LLM_API_KEY || ''
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'No API key available to test' }, { status: 400 })
  }

  const started = Date.now()
  try {
    const provider = instantiate({
      kind,
      model,
      apiKey,
      baseUrl: baseUrl || undefined,
    })
    const res = await provider.complete({
      messages: [
        { role: 'system', content: 'Reply with the single word: OK' },
        { role: 'user', content: 'ping' },
      ],
      // Reasoning models need headroom for <think>; 300 covers them and
      // is still trivially cheap for non-reasoning models.
      maxTokens: 300,
      temperature: 0,
      timeoutMs: 30_000,
    })
    const elapsed = Date.now() - started
    return NextResponse.json({
      ok: true,
      model: res.model,
      provider: res.provider,
      sample: res.text.slice(0, 60),
      elapsedMs: elapsed,
      usage: res.usage,
    })
  } catch (err: any) {
    const elapsed = Date.now() - started
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || String(err),
        elapsedMs: elapsed,
      },
      { status: 200 }
    )
  }
}
