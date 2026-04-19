import type { CompletionRequest, CompletionResponse, LLMProvider, Message, ProviderConfig, ToolCall } from '../types'

/**
 * Anthropic Messages API. System goes in a top-level `system` field.
 * Tool use follows the content-block pattern: tool_use for model calls,
 * tool_result for tool responses.
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic'
  private baseUrl: string
  private apiKey: string
  private defaultModel: string

  constructor(cfg: ProviderConfig) {
    this.baseUrl = (cfg.baseUrl || 'https://api.anthropic.com').replace(/\/$/, '')
    this.apiKey = cfg.apiKey
    this.defaultModel = cfg.model
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const model = req.model || this.defaultModel

    const systemPieces: string[] = []
    const convoMessages: Message[] = []
    for (const m of req.messages) {
      if (m.role === 'system') systemPieces.push(m.content)
      else convoMessages.push(m)
    }
    if (req.jsonMode && !req.tools?.length) {
      systemPieces.push('Respond with ONLY a valid JSON object. No prose, no markdown fences.')
    }

    const body: any = {
      model,
      max_tokens: req.maxTokens ?? 4096,
      temperature: req.temperature ?? 0.2,
      messages: convoMessages.map(m => {
        if (m.role === 'tool') {
          return {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: m.toolCallId,
                content: m.content,
              },
            ],
          }
        }
        if (m.role === 'assistant' && m.toolCalls?.length) {
          const blocks: any[] = []
          if (m.content) blocks.push({ type: 'text', text: m.content })
          for (const tc of m.toolCalls) {
            blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments })
          }
          return { role: 'assistant', content: blocks }
        }
        return { role: m.role, content: m.content }
      }),
    }
    if (systemPieces.length) body.system = systemPieces.join('\n\n')
    if (req.tools?.length) {
      body.tools = req.tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }))
      if (req.toolChoice === 'none') body.tool_choice = { type: 'none' }
      else if (req.toolChoice && typeof req.toolChoice === 'object') {
        body.tool_choice = { type: 'tool', name: req.toolChoice.name }
      } else body.tool_choice = { type: 'auto' }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 120_000)

    try {
      const res = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`anthropic ${res.status}: ${errText.slice(0, 500) || res.statusText}`)
      }

      const json: any = await res.json()
      const blocks: any[] = Array.isArray(json?.content) ? json.content : []

      const text = blocks
        .filter(b => b?.type === 'text' && typeof b.text === 'string')
        .map(b => b.text)
        .join('\n')

      const toolCallBlocks = blocks.filter(b => b?.type === 'tool_use')
      const toolCalls: ToolCall[] | undefined = toolCallBlocks.length
        ? toolCallBlocks.map(b => ({
            id: b.id,
            name: b.name,
            arguments: (b.input as Record<string, unknown>) || {},
          }))
        : undefined

      if (!text && !toolCalls?.length) {
        throw new Error(`anthropic returned no content: ${JSON.stringify(json).slice(0, 300)}`)
      }

      return {
        text,
        toolCalls,
        finishReason: json?.stop_reason,
        model: json.model || model,
        provider: 'anthropic',
        usage: {
          inputTokens: json?.usage?.input_tokens,
          outputTokens: json?.usage?.output_tokens,
        },
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}
