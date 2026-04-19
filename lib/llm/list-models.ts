import type { ProviderConfig } from './types'

export interface ModelEntry {
  id: string
  label?: string
}

function dedupe(entries: ModelEntry[]): ModelEntry[] {
  const seen = new Set<string>()
  const out: ModelEntry[] = []
  for (const e of entries) {
    if (!e.id || seen.has(e.id)) continue
    seen.add(e.id)
    out.push(e)
  }
  return out
}

/**
 * Fetch the list of available models from a provider using its config.
 * Returns just IDs (and optional human labels where providers give them).
 * Deduplicates — some providers (Mistral) list aliases twice.
 */
export async function listModels(cfg: ProviderConfig, timeoutMs = 15_000): Promise<ModelEntry[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    switch (cfg.kind) {
      case 'openai-compatible': {
        const base = (cfg.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
        const res = await fetch(`${base}/models`, {
          headers: { Authorization: `Bearer ${cfg.apiKey}` },
          signal: controller.signal,
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(`${res.status}: ${text.slice(0, 300) || res.statusText}`)
        }
        const json: any = await res.json()
        const data: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json?.models) ? json.models : []
        return dedupe(
          data
            .map((m): ModelEntry => ({ id: m?.id || m?.name, label: m?.display_name || m?.name }))
            .filter(m => !!m.id),
        )
      }

      case 'anthropic': {
        const base = (cfg.baseUrl || 'https://api.anthropic.com').replace(/\/$/, '')
        const res = await fetch(`${base}/v1/models`, {
          headers: {
            'x-api-key': cfg.apiKey,
            'anthropic-version': '2023-06-01',
          },
          signal: controller.signal,
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(`${res.status}: ${text.slice(0, 300) || res.statusText}`)
        }
        const json: any = await res.json()
        const data: any[] = Array.isArray(json?.data) ? json.data : []
        return dedupe(
          data
            .map((m): ModelEntry => ({ id: m?.id, label: m?.display_name }))
            .filter(m => !!m.id),
        )
      }

      case 'google': {
        const base = (cfg.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/$/, '')
        // OAuth tokens go in the Authorization header; API keys go in ?key=.
        const useBearer = cfg.authMode === 'bearer'
        const url = useBearer
          ? `${base}/v1beta/models`
          : `${base}/v1beta/models?key=${encodeURIComponent(cfg.apiKey)}`
        const headers: Record<string, string> = {}
        if (useBearer) headers['Authorization'] = `Bearer ${cfg.apiKey}`
        const res = await fetch(url, { headers, signal: controller.signal })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(`${res.status}: ${text.slice(0, 300) || res.statusText}`)
        }
        const json: any = await res.json()
        const models: any[] = Array.isArray(json?.models) ? json.models : []
        return dedupe(
          models
            .filter(m =>
              !Array.isArray(m?.supportedGenerationMethods) ||
              m.supportedGenerationMethods.includes('generateContent')
            )
            .map((m): ModelEntry => {
              const raw = m?.name as string | undefined
              const id = raw?.replace(/^models\//, '') || ''
              return { id, label: m?.displayName }
            })
            .filter(m => !!m.id),
        )
      }
    }
  } finally {
    clearTimeout(timer)
  }
}
