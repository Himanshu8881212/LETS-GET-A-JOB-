'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, X, Sparkles, Brain, ChevronDown, Paperclip, FileText, Search as SearchIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { DotPulse, Spinner } from './ui/Spinner'

interface ToolCall {
  name: string
  arguments: Record<string, unknown>
  result?: unknown
  error?: string
}

interface Attachment {
  name: string
  mimeType: string
  base64: string
  /** Client-side only — displayed on the user bubble that produced it. */
  size: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  toolCalls?: ToolCall[]
  attachments?: Array<{ name: string; size: number }>
  ts: number
}

const SESSION_KEY = 'scout-session-id'
const HISTORY_KEY = 'scout-chat-history'

function randomSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/**
 * Some reasoning models emit their thinking inline as <think>...</think> blocks
 * inside the text. Pull those out into a separate reasoning string.
 */
function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}

function splitThinkTags(content: string): { text: string; reasoning?: string } {
  const parts: string[] = []
  const out: string[] = []
  let i = 0
  while (i < content.length) {
    const open = content.indexOf('<think>', i)
    if (open === -1) {
      out.push(content.slice(i))
      break
    }
    out.push(content.slice(i, open))
    const close = content.indexOf('</think>', open)
    if (close === -1) {
      parts.push(content.slice(open + 7))
      i = content.length
    } else {
      parts.push(content.slice(open + 7, close))
      i = close + 8
    }
  }
  return {
    text: out.join('').trim(),
    reasoning: parts.length ? parts.join('\n').trim() : undefined,
  }
}

export default function ScoutChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reasoningOpen, setReasoningOpen] = useState<Record<number, boolean>>({})
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([])
  const sessionRef = useRef<string>('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let sid = localStorage.getItem(SESSION_KEY)
    if (!sid) {
      sid = randomSessionId()
      localStorage.setItem(SESSION_KEY, sid)
    }
    sessionRef.current = sid

    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) setMessages(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    if (messages.length) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-50)))
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  const send = async () => {
    const text = input.trim()
    if ((!text && pendingFiles.length === 0) || sending) return

    const userMsg: Message = {
      role: 'user',
      content: text || '(attached a document)',
      attachments: pendingFiles.map(f => ({ name: f.name, size: f.size })),
      ts: Date.now(),
    }
    setMessages(m => [...m, userMsg])
    setInput('')
    setError(null)
    setSending(true)

    const attachmentsPayload = pendingFiles.map(f => ({
      name: f.name,
      mimeType: f.mimeType,
      base64: f.base64,
    }))
    setPendingFiles([])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionRef.current,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          attachments: attachmentsPayload,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.hint || data.detail || data.error || 'Scout is unavailable')
        return
      }

      const split = splitThinkTags(String(data.reply || '…'))
      const reply: Message = {
        role: 'assistant',
        content: split.text || data.reply || '…',
        reasoning: split.reasoning,
        toolCalls: Array.isArray(data.toolTrace) ? data.toolTrace : undefined,
        ts: Date.now(),
      }
      setMessages(m => [...m, reply])
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return
    const accepted: Attachment[] = []
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is larger than 10 MB — skipped.`)
        continue
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = reject
        reader.onload = () => {
          const result = reader.result as string
          const comma = result.indexOf(',')
          resolve(comma >= 0 ? result.slice(comma + 1) : result)
        }
        reader.readAsDataURL(file)
      }).catch(() => '')
      if (!base64) continue
      accepted.push({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64,
        size: file.size,
      })
    }
    setPendingFiles(p => [...p, ...accepted])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removePendingFile = (idx: number) => {
    setPendingFiles(p => p.filter((_, i) => i !== idx))
  }

  const clearHistory = () => {
    setMessages([])
    setReasoningOpen({})
    setError(null)
    localStorage.removeItem(HISTORY_KEY)
  }

  const toggleReasoning = (i: number) => {
    setReasoningOpen(prev => ({ ...prev, [i]: !prev[i] }))
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Scout chat"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-brand-ink text-white shadow-soft hover:bg-brand-slate transition-all px-5 py-3"
      >
        <Sparkles className="w-5 h-5" />
        <span className="font-medium">Ask Scout</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[420px] max-w-[95vw] h-[620px] max-h-[85vh] bg-white border border-brand-border shadow-soft rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-brand-ink text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <div>
            <div className="font-semibold leading-tight">Scout</div>
            <div className="text-xs text-white/70 leading-tight">AI career assistant</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs text-white/70 hover:text-white px-2 py-1 rounded"
              title="Clear chat"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close Scout chat"
            className="p-1 hover:bg-brand-slate rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-brand-mist/40">
        {messages.length === 0 && (
          <div className="text-sm text-brand-steel bg-white border border-brand-border rounded-lg p-4">
            <p className="font-medium text-brand-ink mb-1">Hey! I&apos;m Scout.</p>
            <p>Ask me about your resume, cover letter, or interview prep. I&apos;ll give specific, actionable advice.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-brand-ink text-white rounded-2xl rounded-br-md px-3 py-2 whitespace-pre-wrap'
                  : 'bg-white border border-brand-border text-brand-ink rounded-2xl rounded-bl-md px-3.5 py-2.5'
              }`}
            >
              {m.role === 'assistant' && m.reasoning && (
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => toggleReasoning(i)}
                    className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-brand-steel hover:text-brand-ink"
                  >
                    <Brain className="w-3 h-3" />
                    <span>{reasoningOpen[i] ? 'Hide thinking' : 'Show thinking'}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${reasoningOpen[i] ? 'rotate-180' : ''}`} />
                  </button>
                  {reasoningOpen[i] && (
                    <div className="mt-1.5 p-2 rounded-lg bg-brand-mist text-brand-steel text-xs whitespace-pre-wrap border border-brand-border/60 font-mono leading-relaxed">
                      {m.reasoning}
                    </div>
                  )}
                </div>
              )}
              {m.attachments && m.attachments.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {m.attachments.map((a, ai) => (
                    <span
                      key={ai}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${m.role === 'user' ? 'bg-white/15 text-white' : 'bg-brand-mist text-brand-slate'}`}
                    >
                      <FileText className="w-2.5 h-2.5" /> {a.name}
                    </span>
                  ))}
                </div>
              )}
              {m.role === 'assistant' ? (
                <div className="scout-md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
              {m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0 && (
                <details className="mt-2 rounded-lg border border-brand-border bg-brand-mist/40 px-2 py-1">
                  <summary className="cursor-pointer text-[11px] text-brand-steel inline-flex items-center gap-1.5">
                    <SearchIcon className="w-3 h-3" />
                    {m.toolCalls.length} tool call{m.toolCalls.length === 1 ? '' : 's'}
                  </summary>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-brand-slate">
                    {m.toolCalls.map((tc, ti) => (
                      <li key={ti} className="font-mono break-words">
                        <span className="text-brand-ink">{tc.name}</span>
                        <span className="text-brand-steel">({Object.entries(tc.arguments || {}).map(([k, v]) => `${k}: ${truncate(String(v), 40)}`).join(', ')})</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-brand-border rounded-2xl rounded-bl-md px-3 py-2 text-sm text-brand-steel flex items-center gap-2">
              <DotPulse /> Thinking…
            </div>
          </div>
        )}
        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
            {error}
          </div>
        )}
      </div>

      {pendingFiles.length > 0 && (
        <div className="border-t border-brand-border px-3 py-2 bg-brand-mist/40 flex flex-wrap gap-1.5">
          {pendingFiles.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-white px-2.5 py-1 text-xs text-brand-slate">
              <FileText className="w-3 h-3" />
              {f.name}
              <button
                onClick={() => removePendingFile(i)}
                className="text-brand-steel hover:text-red-700"
                aria-label={`Remove ${f.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <form
        onSubmit={e => {
          e.preventDefault()
          send()
        }}
        className="border-t border-brand-border p-3 flex items-end gap-2 bg-white"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          className="hidden"
          onChange={e => handleFileSelect(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-brand-steel hover:text-brand-ink hover:bg-brand-mist rounded-lg transition-colors"
          title="Attach a document (PDF, TXT, MD)"
          aria-label="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          placeholder="Ask Scout anything…"
          className="flex-1 resize-none max-h-32 px-3 py-2 text-sm border border-brand-border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent text-brand-ink"
        />
        <button
          type="submit"
          disabled={sending || (!input.trim() && pendingFiles.length === 0)}
          className="p-2 bg-brand-ink text-white rounded-lg hover:bg-brand-slate disabled:bg-brand-steel disabled:cursor-not-allowed transition-colors"
          aria-label="Send"
        >
          {sending ? <Spinner size="md" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  )
}
