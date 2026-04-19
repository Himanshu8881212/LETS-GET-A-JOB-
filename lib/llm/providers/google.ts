import type { CompletionRequest, CompletionResponse, LLMProvider, ProviderConfig, ToolCall } from '../types'

/**
 * Google Gemini via generateContent API.
 * Tool use: pass `tools: [{ functionDeclarations: [...] }]` and look for
 * `functionCall` parts in the response.
 */
export class GoogleProvider implements LLMProvider {
  readonly name = 'google'
  private baseUrl: string
  private apiKey: string
  private defaultModel: string
  private useBearer: boolean

  constructor(cfg: ProviderConfig) {
    this.baseUrl = (cfg.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/$/, '')
    this.apiKey = cfg.apiKey
    this.defaultModel = cfg.model
    this.useBearer = cfg.authMode === 'bearer'
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const model = req.model || this.defaultModel

    const systemPieces: string[] = []
    const contents: Array<{ role: 'user' | 'model'; parts: any[] }> = []

    for (const m of req.messages) {
      if (m.role === 'system') {
        systemPieces.push(m.content)
        continue
      }
      if (m.role === 'tool') {
        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: m.toolCallId || 'tool',
                response: { content: m.content },
              },
            },
          ],
        })
        continue
      }
      if (m.role === 'assistant' && m.toolCalls?.length) {
        const parts: any[] = []
        if (m.content) parts.push({ text: m.content })
        for (const tc of m.toolCalls) {
          parts.push({ functionCall: { name: tc.name, args: tc.arguments } })
        }
        contents.push({ role: 'model', parts })
        continue
      }
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })
    }

    if (req.jsonMode && !req.tools?.length) {
      systemPieces.push('Respond with ONLY a valid JSON object. No prose, no markdown fences.')
    }

    const body: any = {
      contents,
      generationConfig: {
        temperature: req.temperature ?? 0.2,
        ...(req.maxTokens ? { maxOutputTokens: req.maxTokens } : {}),
        ...(req.jsonMode && !req.tools?.length ? { responseMimeType: 'application/json' } : {}),
      },
    }
    if (systemPieces.length) {
      body.systemInstruction = { parts: [{ text: systemPieces.join('\n\n') }] }
    }
    if (req.tools?.length) {
      body.tools = [
        {
          functionDeclarations: req.tools.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ]
      if (req.toolChoice === 'none') body.toolConfig = { functionCallingConfig: { mode: 'NONE' } }
      else if (req.toolChoice && typeof req.toolChoice === 'object') {
        body.toolConfig = {
          functionCallingConfig: { mode: 'ANY', allowedFunctionNames: [req.toolChoice.name] },
        }
      } else body.toolConfig = { functionCallingConfig: { mode: 'AUTO' } }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 120_000)

    try {
      // When authenticated via OAuth (Antigravity), the access token goes in
      // the Authorization header. With a plain AI Studio API key it goes in
      // the ?key= query param.
      const url = this.useBearer
        ? `${this.baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent`
        : `${this.baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (this.useBearer) headers['Authorization'] = `Bearer ${this.apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`google ${res.status}: ${errText.slice(0, 500) || res.statusText}`)
      }

      const json: any = await res.json()
      const candidate = json?.candidates?.[0]
      const parts: any[] = candidate?.content?.parts || []

      const text = parts
        .filter(p => typeof p?.text === 'string')
        .map(p => p.text)
        .join('\n')

      const fnCallParts = parts.filter(p => p?.functionCall)
      const toolCalls: ToolCall[] | undefined = fnCallParts.length
        ? fnCallParts.map((p, i) => ({
            id: `call_${i}_${Math.random().toString(36).slice(2, 8)}`,
            name: p.functionCall.name,
            arguments: (p.functionCall.args as Record<string, unknown>) || {},
          }))
        : undefined

      if (!text && !toolCalls?.length) {
        throw new Error(`google returned no content: ${JSON.stringify(json).slice(0, 300)}`)
      }

      return {
        text,
        toolCalls,
        finishReason: candidate?.finishReason,
        model,
        provider: 'google',
        usage: {
          inputTokens: json?.usageMetadata?.promptTokenCount,
          outputTokens: json?.usageMetadata?.candidatesTokenCount,
        },
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}
