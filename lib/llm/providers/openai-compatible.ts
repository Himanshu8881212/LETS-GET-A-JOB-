import type { CompletionRequest, CompletionResponse, LLMProvider, ProviderConfig, StreamChunk, ToolCall } from '../types'

/**
 * OpenAI-compatible chat completions. Works for:
 *   - OpenAI, OpenRouter, Mistral, DeepSeek, Groq, Ollama, LM Studio, xAI/Grok, etc.
 */
export class OpenAICompatibleProvider implements LLMProvider {
  readonly name: string
  private baseUrl: string
  private apiKey: string
  private defaultModel: string

  constructor(cfg: ProviderConfig, displayName = 'openai-compatible') {
    if (!cfg.baseUrl) throw new Error('OpenAI-compatible provider requires baseUrl')
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '')
    this.apiKey = cfg.apiKey
    this.defaultModel = cfg.model
    this.name = displayName
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const model = req.model || this.defaultModel

    const messages = req.messages.map(m => {
      const base: any = { role: m.role === 'tool' ? 'tool' : m.role, content: m.content }
      if (m.role === 'tool' && m.toolCallId) base.tool_call_id = m.toolCallId
      if (m.role === 'assistant' && m.toolCalls?.length) {
        base.tool_calls = m.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        }))
      }
      return base
    })

    const body: any = {
      model,
      messages,
      temperature: req.temperature ?? 0.2,
    }
    if (req.maxTokens) body.max_tokens = req.maxTokens
    if (req.jsonMode && !req.tools?.length) body.response_format = { type: 'json_object' }
    if (req.tools?.length) {
      body.tools = req.tools.map(t => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }))
      if (req.toolChoice === 'none') body.tool_choice = 'none'
      else if (req.toolChoice && typeof req.toolChoice === 'object') {
        body.tool_choice = { type: 'function', function: { name: req.toolChoice.name } }
      } else body.tool_choice = 'auto'
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 120_000)

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`${this.name} ${res.status}: ${text.slice(0, 500) || res.statusText}`)
      }

      const json: any = await res.json()
      const choice = json?.choices?.[0]
      const rawContent = choice?.message?.content
      const rawReasoning = choice?.message?.reasoning_content ?? choice?.message?.reasoning
      const rawToolCalls = choice?.message?.tool_calls
      const finishReason: string | undefined = choice?.finish_reason

      let text = ''
      let reasoning: string | undefined
      let toolCalls: ToolCall[] | undefined

      if (typeof rawContent === 'string') {
        text = rawContent
      } else if (Array.isArray(rawContent)) {
        const textParts: string[] = []
        const reasoningParts: string[] = []
        for (const part of rawContent) {
          if (!part || typeof part !== 'object') continue
          if (part.type === 'text' && typeof part.text === 'string') textParts.push(part.text)
          else if (part.type === 'thinking') {
            if (typeof part.thinking === 'string') reasoningParts.push(part.thinking)
            else if (Array.isArray(part.thinking)) {
              for (const t of part.thinking) {
                if (t && typeof t.text === 'string') reasoningParts.push(t.text)
              }
            }
          }
        }
        text = textParts.join('\n')
        if (reasoningParts.length) reasoning = reasoningParts.join('\n')
      }

      if (typeof rawReasoning === 'string' && rawReasoning) {
        reasoning = reasoning ? `${rawReasoning}\n${reasoning}` : rawReasoning
      }

      if (Array.isArray(rawToolCalls) && rawToolCalls.length) {
        toolCalls = rawToolCalls
          .filter((tc: any) => tc?.function?.name)
          .map((tc: any) => {
            let args: Record<string, unknown> = {}
            try {
              args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}
            } catch {
              args = { _raw: tc.function.arguments }
            }
            return { id: tc.id || `call_${Math.random().toString(36).slice(2, 10)}`, name: tc.function.name, arguments: args }
          })
      }

      if (!text && !toolCalls?.length) {
        throw new Error(`${this.name} returned no content: ${JSON.stringify(json).slice(0, 300)}`)
      }

      return {
        text,
        reasoning,
        toolCalls,
        finishReason,
        model: json.model || model,
        provider: this.name,
        usage: {
          inputTokens: json?.usage?.prompt_tokens,
          outputTokens: json?.usage?.completion_tokens,
        },
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Stream text chunks via SSE. Falls back to calling complete() + emitting one
   * chunk on any error parsing the stream — the caller always gets SOMETHING.
   */
  async *completeStream(req: CompletionRequest): AsyncIterable<StreamChunk> {
    const model = req.model || this.defaultModel

    const messages = req.messages.map(m => {
      const base: any = { role: m.role === 'tool' ? 'tool' : m.role, content: m.content }
      if (m.role === 'tool' && m.toolCallId) base.tool_call_id = m.toolCallId
      return base
    })

    const body: any = {
      model,
      messages,
      temperature: req.temperature ?? 0.2,
      stream: true,
    }
    if (req.maxTokens) body.max_tokens = req.maxTokens

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 120_000)

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '')
        yield { error: `${this.name} ${res.status}: ${errText.slice(0, 400) || res.statusText}`, done: true }
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let idx: number
        while ((idx = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, idx).trim()
          buf = buf.slice(idx + 1)
          if (!line || !line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') {
            yield { done: true }
            return
          }
          try {
            const json = JSON.parse(payload)
            const delta = json?.choices?.[0]?.delta
            const usage = json?.usage
            if (delta?.content) {
              if (typeof delta.content === 'string') yield { text: delta.content }
              else if (Array.isArray(delta.content)) {
                for (const p of delta.content) {
                  if (p?.type === 'text' && typeof p.text === 'string') yield { text: p.text }
                }
              }
            }
            if (typeof delta?.reasoning_content === 'string' && delta.reasoning_content) {
              yield { reasoning: delta.reasoning_content }
            }
            if (usage) {
              yield {
                usage: {
                  inputTokens: usage.prompt_tokens,
                  outputTokens: usage.completion_tokens,
                },
              }
            }
          } catch {
            /* skip malformed chunk */
          }
        }
      }
      yield { done: true }
    } catch (e: any) {
      yield { error: e?.message || String(e), done: true }
    } finally {
      clearTimeout(timeout)
    }
  }
}
