import { getEmbeddingsConfig } from '@/lib/llm/config'

/**
 * Get a single embedding vector. Supports:
 *   - ollama            → POST {baseUrl}/api/embeddings {model, prompt}
 *   - openai-compatible → POST {baseUrl}/embeddings    {model, input}
 *
 * Returns null on any failure — callers should treat memory as degraded,
 * not fatal. Memory writes still succeed (the content is kept verbatim),
 * they just won't be vector-searchable until re-embedded.
 */
export async function embedText(text: string): Promise<Float32Array | null> {
  const cfg = getEmbeddingsConfig()
  const trimmed = text.trim()
  if (!trimmed) return null

  try {
    if (cfg.kind === 'ollama') {
      const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: cfg.model, prompt: trimmed }),
      })
      if (!res.ok) return null
      const json: any = await res.json()
      const arr: number[] | undefined = json?.embedding
      if (!Array.isArray(arr) || !arr.length) return null
      return Float32Array.from(arr)
    }

    // openai-compatible
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ model: cfg.model, input: trimmed }),
    })
    if (!res.ok) return null
    const json: any = await res.json()
    const arr: number[] | undefined = json?.data?.[0]?.embedding
    if (!Array.isArray(arr) || !arr.length) return null
    return Float32Array.from(arr)
  } catch {
    return null
  }
}

export function embeddingToBuffer(v: Float32Array): Buffer {
  return Buffer.from(v.buffer, v.byteOffset, v.byteLength)
}

export function bufferToEmbedding(buf: Buffer): Float32Array {
  // better-sqlite3 returns Node Buffer; wrap its arrayBuffer as Float32Array
  // Use a fresh ArrayBuffer slice so we own the memory.
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return new Float32Array(ab)
}

export function cosine(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom > 0 ? dot / denom : 0
}
