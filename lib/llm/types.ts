export type Role = 'system' | 'user' | 'assistant' | 'tool'

export interface Message {
  role: Role
  content: string
  /** When role='tool', the tool_call_id this message is a response to. */
  toolCallId?: string
  /** When role='assistant' and the model asked to call tools. */
  toolCalls?: ToolCall[]
}

/** A tool the model can call. JSON schema describes the arguments. */
export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

/** A tool invocation produced by the model. */
export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface CompletionRequest {
  messages: Message[]
  model?: string
  temperature?: number
  maxTokens?: number
  /** Ask the provider to return JSON. OpenAI-compatible → response_format json_object; Anthropic/Google → add instruction. */
  jsonMode?: boolean
  /** Abort after this many milliseconds. */
  timeoutMs?: number
  /** Tools the model is allowed to call. */
  tools?: ToolDefinition[]
  /** 'auto' | 'none' | { name: string } — lets us force-pick a tool. */
  toolChoice?: 'auto' | 'none' | { name: string }
}

export interface CompletionResponse {
  text: string
  /** Reasoning/thinking trace from reasoning models (Magistral, Claude thinking, etc.). */
  reasoning?: string
  /** Populated when the model asked to call tools instead of (or alongside) returning text. */
  toolCalls?: ToolCall[]
  /** 'stop' | 'tool_calls' | 'length' | etc. Tells the agent loop why the model stopped. */
  finishReason?: string
  model: string
  provider: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
  }
}

export interface StreamChunk {
  /** A chunk of text. May be empty when only metadata is updated. */
  text?: string
  /** Reasoning trace chunk (models that expose it). */
  reasoning?: string
  /** Sent once at the end with final usage. */
  usage?: { inputTokens?: number; outputTokens?: number }
  /** True on the final chunk. */
  done?: boolean
  /** Non-recoverable error from the provider. */
  error?: string
}

export interface LLMProvider {
  readonly name: string
  complete(req: CompletionRequest): Promise<CompletionResponse>
  /** Optional streaming. Providers that don't implement this fall back to complete(). */
  completeStream?(req: CompletionRequest): AsyncIterable<StreamChunk>
}

export type ProviderKind = 'openai-compatible' | 'anthropic' | 'google'

export interface ProviderConfig {
  kind: ProviderKind
  baseUrl?: string
  apiKey: string
  model: string
  /**
   * How to pass the credential to the provider.
   *   'auto'   — provider default (api-key query for Google, Bearer for OpenAI/Anthropic)
   *   'bearer' — force Authorization: Bearer <apiKey> (used for OAuth tokens against Google)
   */
  authMode?: 'auto' | 'bearer'
}

export type FeatureName =
  | 'default'
  | 'parseJd'
  | 'parseResume'
  | 'parseCoverLetter'
  | 'generateResume'
  | 'generateCoverLetter'
  | 'evaluateAts'
  | 'scoutChat'
  | 'agent'

// ─────────────────────────────────────────────────────────────────────────
// Embeddings — used by the MemPalace-style memory store.
// ─────────────────────────────────────────────────────────────────────────

export type EmbeddingsKind = 'ollama' | 'openai-compatible'

export interface EmbeddingsConfig {
  kind: EmbeddingsKind
  baseUrl: string
  apiKey: string
  model: string
  /** Dimensions of the returned vector — auto-filled from first response if omitted. */
  dimensions?: number
}
