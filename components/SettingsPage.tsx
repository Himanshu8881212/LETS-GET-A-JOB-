'use client'

import { useEffect, useRef, useState } from 'react'
import { Activity, AlertTriangle, ArrowLeft, Brain, Check, ChevronDown, ChevronRight, Play, RefreshCw, Save, Search, X } from 'lucide-react'
import { Button } from './ui/Button'
import { Spinner } from './ui/Spinner'
import { useToast } from './ui/Toast'

interface FeatureConfig {
  provider: string
  model: string
  apiKey: string
  baseUrl: string
  hasApiKey: boolean
}

interface SettingsPageProps {
  onBack: () => void
  onOpenMemory?: () => void
}

type ProviderKind = 'openai-compatible' | 'anthropic' | 'google'

interface ServiceOption {
  id: string
  label: string
  kind: ProviderKind
  baseUrl: string
  defaultModel: string
  keyHint: string
}

interface ServiceOptionExt extends ServiceOption {
  authKind: 'oauth' | 'apiKey' | 'local'
  oauthProvider?: 'openai_codex'
  warning?: string
  /**
   * For OAuth services — the /models endpoint requires scopes OpenAI/Google
   * don't grant to the CLI client_ids we're using. These tokens DO work for
   * inference, so we ship a curated list of IDs the subscription tiers
   * accept (researched April 2026). The ModelCombobox also accepts any
   * custom string the user types — so new models OpenAI ships next week
   * are still usable without a code change.
   */
  presetModels?: Array<{ id: string; label: string }>
}

const SERVICES: ServiceOptionExt[] = [
  {
    id: 'openai_oauth',
    label: 'OpenAI — sign in with ChatGPT',
    kind: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5',
    keyHint: '',
    authKind: 'oauth',
    oauthProvider: 'openai_codex',
    // Model IDs your ChatGPT subscription grants via Codex OAuth
    // (researched April 2026). Requires Plus ($20), Pro $100, or Pro $200.
    presetModels: [
      { id: 'gpt-5', label: 'GPT-5 (5.3 Instant — daily driver)' },
      { id: 'gpt-5-mini', label: 'GPT-5 mini (fast + cheap)' },
      { id: 'gpt-5-thinking', label: 'GPT-5 Thinking (reasoning — Plus+)' },
      { id: 'gpt-5-pro', label: 'GPT-5 Pro (hardest tasks — Pro tier only)' },
      { id: 'gpt-5-codex', label: 'GPT-5 Codex (code-tuned — Plus/Pro)' },
      { id: 'gpt-4o', label: 'GPT-4o (legacy, still available)' },
    ],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    kind: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    keyHint: 'sk-or-...',
    authKind: 'apiKey',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    kind: 'openai-compatible',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-medium-latest',
    keyHint: 'Mistral API key',
    authKind: 'apiKey',
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    kind: 'openai-compatible',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5:14b',
    keyHint: 'ollama',
    authKind: 'local',
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (local)',
    kind: 'openai-compatible',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'llama-3.1-70b-instruct',
    keyHint: 'lmstudio',
    authKind: 'local',
  },
]

function findService(kind: string, baseUrl: string): ServiceOption | undefined {
  return SERVICES.find(s => s.kind === kind && (s.baseUrl || '') === (baseUrl || ''))
}

interface ModelEntry { id: string; label?: string }

function ModelCombobox({
  value,
  options,
  loading,
  onChange,
  placeholder,
}: {
  value: string
  options: ModelEntry[]
  loading: boolean
  onChange: (id: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const filtered = filter.trim()
    ? options.filter(o => {
        const q = filter.toLowerCase()
        return o.id.toLowerCase().includes(q) || (o.label || '').toLowerCase().includes(q)
      })
    : options

  const commit = (id: string) => {
    onChange(id)
    setFilter('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight(h => Math.min(filtered.length, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(0, h - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (!open) return setOpen(true)
      const picked = filtered[highlight]
      if (picked) commit(picked.id)
      else if (filter.trim()) commit(filter.trim())
    } else if (e.key === 'Escape') {
      setOpen(false)
      setFilter('')
    }
  }

  useEffect(() => { setHighlight(0) }, [filter, options])

  const display = open ? filter : value

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center rounded-lg border border-brand-border bg-white focus-within:ring-1 focus-within:ring-brand-accent focus-within:border-brand-accent">
        <Search className="w-4 h-4 text-brand-steel ml-3" />
        <input
          ref={inputRef}
          type="text"
          value={display}
          onChange={e => {
            setFilter(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent px-2 py-2 text-sm text-brand-ink font-mono focus:outline-none"
        />
        {value && !open && (
          <button
            type="button"
            onClick={() => commit('')}
            className="p-1 mr-1 text-brand-steel hover:text-brand-ink rounded"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown
          className={`w-4 h-4 text-brand-steel mr-3 transition-transform ${open ? 'rotate-180' : ''} cursor-pointer`}
          onClick={() => { setOpen(o => !o); inputRef.current?.focus() }}
        />
      </div>
      {open && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-full max-h-80 overflow-y-auto rounded-lg border border-brand-border bg-white shadow-soft"
        >
          {loading && (
            <div className="px-3 py-2 text-xs text-brand-steel flex items-center gap-2">
              <Spinner size="sm" />
              Fetching models…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-brand-steel">
              {options.length === 0
                ? 'No models loaded yet. Save your API key to fetch the live list.'
                : 'No match in the fetched list. Press Enter to use this as a custom model name.'}
            </div>
          )}
          {filtered.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); commit(m.id) }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3 py-2 text-sm font-mono truncate ${
                i === highlight ? 'bg-brand-mist text-brand-ink' : 'text-brand-slate hover:bg-brand-mist'
              }`}
            >
              {m.id}
              {m.label && m.label !== m.id && (
                <span className="ml-2 text-xs text-brand-steel">{m.label}</span>
              )}
            </button>
          ))}
          {filter.trim() && !filtered.some(m => m.id === filter.trim()) && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); commit(filter.trim()) }}
              className={`w-full text-left px-3 py-2 text-xs border-t border-brand-border ${
                highlight === filtered.length ? 'bg-brand-mist text-brand-ink' : 'text-brand-slate hover:bg-brand-mist'
              }`}
            >
              Use custom model: <span className="font-mono">{filter.trim()}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface EmbeddingsConfigOut {
  provider: string
  model: string
  apiKey: string
  baseUrl: string
  hasApiKey: boolean
}

export default function SettingsPage({ onBack, onOpenMemory }: SettingsPageProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; elapsedMs?: number } | null>(null)

  const [serviceId, setServiceId] = useState<string>('openai')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [hasSavedKey, setHasSavedKey] = useState(false)
  const [dirty, setDirty] = useState(false)

  const [modelOptions, setModelOptions] = useState<ModelEntry[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)

  // Embeddings state — powers the MemPalace-style memory store.
  const [embProvider, setEmbProvider] = useState<'ollama' | 'openai-compatible'>('ollama')
  const [embBaseUrl, setEmbBaseUrl] = useState('http://localhost:11434')
  const [embModel, setEmbModel] = useState('nomic-embed-text')
  const [embApiKey, setEmbApiKey] = useState('')
  const [embHasKey, setEmbHasKey] = useState(false)
  const [embDirty, setEmbDirty] = useState(false)

  // OAuth state per supported provider.
  interface OAuthState {
    signedIn: boolean
    accountEmail: string | null
    accountName: string | null
    expiresAt: string | null
    busy: boolean
  }
  const [oauthState, setOauthState] = useState<Record<string, OAuthState>>({
    openai_codex: { signedIn: false, accountEmail: null, accountName: null, expiresAt: null, busy: false },
  })
  const [activeOauth, setActiveOauth] = useState<string | null>(null)

  const refreshOauthStatus = async () => {
    try {
      const o1 = await fetch('/api/oauth/openai_codex/status').then(r => r.json())
      setOauthState(prev => ({
        ...prev,
        openai_codex: {
          ...prev.openai_codex,
          signedIn: !!o1.signedIn,
          accountEmail: o1.accountEmail ?? null,
          accountName: o1.accountName ?? null,
          expiresAt: o1.expiresAt ?? null,
        },
      }))
    } catch { /* noop */ }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/settings')
        const data: { features: Record<string, FeatureConfig & { oauth?: string }>; embeddings?: EmbeddingsConfigOut } = await res.json()
        const d = data.features.agent?.provider ? data.features.agent : (data.features.default || ({} as any))

        // If OAuth is the active auth method, pick the matching OAuth service.
        const oauthKey: string = (d as any).oauth || ''
        if (oauthKey === 'openai_codex') setServiceId('openai_oauth')
        else {
          const match = findService(d.provider || 'openai-compatible', d.baseUrl || 'https://openrouter.ai/api/v1')
          setServiceId(match?.id || 'openrouter')
        }
        if (oauthKey) setActiveOauth(oauthKey)

        setModel(d.model || '')
        setHasSavedKey(!!d.hasApiKey)
        if (data.embeddings) {
          const e = data.embeddings
          setEmbProvider((e.provider as any) || 'ollama')
          setEmbBaseUrl(e.baseUrl || (e.provider === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com/v1'))
          setEmbModel(e.model || (e.provider === 'ollama' ? 'nomic-embed-text' : 'text-embedding-3-small'))
          setEmbHasKey(!!e.hasApiKey)
        }
      } catch (e: any) {
        showToast('error', 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    })()
    refreshOauthStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast])

  const service = SERVICES.find(s => s.id === serviceId) || SERVICES[0]

  const refreshModels = async (opts?: { silent?: boolean; overrideKey?: string }) => {
    const silent = opts?.silent === true
    const keyToUse = opts?.overrideKey ?? apiKey

    const isOauth = service.authKind === 'oauth'
    const oauthKey = isOauth ? service.oauthProvider : undefined
    const oauthSignedIn = isOauth && oauthKey ? !!oauthState[oauthKey]?.signedIn : false
    const isLocal = service.authKind === 'local'

    // OAuth: use the curated preset — these tokens don't have /models
    // scope (OpenAI + Google both refuse admin scopes on the CLI client_ids),
    // but they work fine for inference. User can also type any model name
    // in the combobox — the preset is just a convenience.
    if (isOauth) {
      if (!oauthSignedIn) {
        if (!silent) setModelsError('Sign in first.')
        return
      }
      setModelOptions(service.presetModels || [])
      setModelsError(null)
      return
    }
    if (!isLocal && !keyToUse.trim() && !hasSavedKey) {
      if (!silent) setModelsError('Enter and save an API key first')
      return
    }

    setModelsLoading(true)
    setModelsError(null)
    try {
      const res = await fetch('/api/settings/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'default',
          provider: service.kind,
          baseUrl: service.baseUrl || undefined,
          apiKey: !isOauth && keyToUse.trim() ? keyToUse.trim() : undefined,
          oauth: oauthKey || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed to fetch models')
      const models: ModelEntry[] = data.models || []
      setModelOptions(models)
    } catch (e: any) {
      const raw = String(e?.message || 'Failed to fetch models')
      // Scope failure → the stored token was minted before we broadened the
      // OAuth scopes. Tell the user what to do: sign out + sign in again.
      const isScopeError =
        /api\.model\.read/i.test(raw) ||
        /insufficient.*scope/i.test(raw) ||
        /ACCESS_TOKEN_SCOPE_INSUFFICIENT/.test(raw) ||
        /Missing scopes/i.test(raw)
      const friendlyMsg = isOauth && isScopeError
        ? 'Your sign-in predates the latest scope set. Click Sign out, then Sign in again — the new consent screen will grant model-listing access.'
        : raw
      if (!silent || isScopeError) setModelsError(friendlyMsg)
      setModelOptions([])
    } finally {
      setModelsLoading(false)
    }
  }

  // Auto-fetch the live model list whenever the service has a working credential.
  useEffect(() => {
    if (loading) return
    const svc = SERVICES.find(s => s.id === serviceId)
    if (!svc) return
    setModelOptions([])
    setModelsError(null)
    if (svc.authKind === 'oauth') {
      const signedIn = svc.oauthProvider ? !!oauthState[svc.oauthProvider]?.signedIn : false
      if (signedIn && svc.presetModels?.length) {
        setModelOptions(svc.presetModels)
      }
      return
    }
    if (svc.authKind === 'local') {
      refreshModels({ silent: true })
      return
    }
    if (hasSavedKey) {
      refreshModels({ silent: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, serviceId, hasSavedKey, oauthState.openai_codex?.signedIn])

  // Debounced auto-refresh as the user types a live API key — no need to
  // click Save before seeing the model list. Fixes the "type key, but model
  // dropdown stays empty" OpenRouter flow.
  useEffect(() => {
    if (loading) return
    if (service.authKind !== 'apiKey') return
    const trimmed = apiKey.trim()
    if (!trimmed || trimmed.includes('*')) return
    if (trimmed.length < 10) return // too short to be a real key
    const t = setTimeout(() => {
      refreshModels({ silent: true, overrideKey: trimmed })
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, serviceId])

  const onServiceChange = (id: string) => {
    const next = SERVICES.find(s => s.id === id)
    if (!next) return
    setServiceId(id)
    setModel('')
    setDirty(true)
    setTestResult(null)
  }

  /**
   * Revoke every other auth method so no stale credentials linger when the
   * user switches providers. Call this before committing to a new provider.
   */
  const revokeOtherAuth = async (keepOauthProvider?: 'openai_codex' | null) => {
    // Sign out of any OAuth provider other than the one we're keeping.
    const providers = ['openai_codex'] as const
    await Promise.all(
      providers
        .filter(p => p !== keepOauthProvider)
        .map(p =>
          fetch(`/api/oauth/${p}/signout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          }).catch(() => {})
        )
    )
    // Wipe stored API keys on every feature slot so they can't be picked
    // up by a fallback resolver. Empty string → delete in upsertSettings.
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: {
            agent: { apiKey: '' } as any,
            default: { apiKey: '' } as any,
          },
        }),
      })
    } catch { /* noop */ }
    setHasSavedKey(false)
  }

  /**
   * OAuth sign-in — opens the authorize URL in a new tab, polls the status
   * endpoint until the token shows up, then saves the service config so
   * llm.agent.oauth points at this provider.
   */
  const signInOauth = async (providerKey: 'openai_codex', svc: ServiceOptionExt) => {
    setOauthState(prev => ({ ...prev, [providerKey]: { ...prev[providerKey], busy: true } }))
    try {
      const res = await fetch(`/api/oauth/${providerKey}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok || !data.authorizeUrl) throw new Error(data.error || 'Failed to start OAuth')
      window.open(data.authorizeUrl, '_blank', 'noopener,noreferrer')

      // Poll every 1.5s up to 5 minutes.
      const deadline = Date.now() + 5 * 60 * 1000
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 1500))
        const s = await fetch(`/api/oauth/${providerKey}/status`).then(r => r.json())
        if (s.signedIn) {
          // Revoke every other credential so the app can't accidentally fall
          // back to a stale Mistral/OpenRouter API key or a leftover OAuth
          // from the other provider.
          await revokeOtherAuth(providerKey)

          // Persist agent config so every feature routes through this OAuth slot.
          await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              features: {
                agent: {
                  provider: svc.kind,
                  baseUrl: svc.baseUrl,
                  model: model.trim() || svc.defaultModel,
                  oauth: providerKey,
                  apiKey: '',
                } as any,
                default: {
                  provider: svc.kind,
                  baseUrl: svc.baseUrl,
                  model: model.trim() || svc.defaultModel,
                  oauth: providerKey,
                  apiKey: '',
                } as any,
              },
            }),
          })
          setActiveOauth(providerKey)
          setModel(model.trim() || svc.defaultModel)
          setHasSavedKey(false)
          await refreshOauthStatus()
          showToast('success', `Signed in to ${svc.label.split(' — ')[0]}`)
          return
        }
      }
      throw new Error('Sign-in timed out. Close the auth tab and try again.')
    } catch (e: any) {
      showToast('error', e?.message || 'Sign-in failed')
    } finally {
      setOauthState(prev => ({ ...prev, [providerKey]: { ...prev[providerKey], busy: false } }))
    }
  }

  const signOutOauth = async (providerKey: 'openai_codex') => {
    try {
      await fetch(`/api/oauth/${providerKey}/signout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      // Clear the agent.oauth marker so the resolver falls back to env/API key.
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: { agent: { oauth: '' } as any, default: { oauth: '' } as any },
        }),
      })
      setActiveOauth(null)
      await refreshOauthStatus()
      showToast('success', 'Signed out')
    } catch (e: any) {
      showToast('error', e?.message || 'Sign-out failed')
    }
  }

  const save = async () => {
    if (!model.trim()) return showToast('error', 'Please enter a model')
    // Local services (Ollama / LM Studio) don't need a key; API-key services do.
    if (service.authKind === 'apiKey' && !apiKey.trim() && !hasSavedKey) {
      return showToast('error', 'Please enter an API key')
    }
    // OAuth services can't be saved without a live session — partial config
    // would leave the runtime with a bare provider/baseUrl/model and no
    // credential, sending requests to the wrong endpoint.
    if (service.authKind === 'oauth') {
      const signedIn = service.oauthProvider ? !!oauthState[service.oauthProvider]?.signedIn : false
      if (!signedIn) return showToast('error', 'Sign in first, then the service will save automatically.')
    }
    setSaving(true)
    try {
      // Switching to a non-OAuth service → revoke any lingering OAuth tokens
      // + clear the oauth marker so the resolver doesn't pick them up.
      if (service.authKind !== 'oauth') {
        await revokeOtherAuth(null) // keepOauthProvider=null → sign out all
        setActiveOauth(null)
      }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: {
            agent: {
              provider: service.kind,
              baseUrl: service.baseUrl,
              model: model.trim(),
              ...(service.authKind !== 'oauth' ? { oauth: '' } : {}),
              ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
            },
            // Mirror to `default` for any code path still reading the legacy slot.
            default: {
              provider: service.kind,
              baseUrl: service.baseUrl,
              model: model.trim(),
              ...(service.authKind !== 'oauth' ? { oauth: '' } : {}),
              ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
            },
          },
          embeddings: embDirty
            ? {
                provider: embProvider,
                baseUrl: embBaseUrl.trim(),
                model: embModel.trim(),
                ...(embApiKey.trim() ? { apiKey: embApiKey.trim() } : {}),
              }
            : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error || 'Save failed')
      showToast('success', 'Settings saved')
      setDirty(false)
      setEmbDirty(false)
      const wasNewKey = !!apiKey.trim()
      setApiKey('')
      setHasSavedKey(true)
      if (embApiKey.trim()) {
        setEmbApiKey('')
        setEmbHasKey(true)
      }
      if (wasNewKey) refreshModels({ silent: true })
    } catch (e: any) {
      showToast('error', e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    if (!model.trim()) return showToast('error', 'Please enter a model')
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'default',
          provider: service.kind,
          baseUrl: service.baseUrl || undefined,
          model: model.trim(),
          apiKey: apiKey.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setTestResult({
          ok: true,
          message: `${data.model} — replied "${(data.sample || '').trim()}"`,
          elapsedMs: data.elapsedMs,
        })
      } else {
        setTestResult({ ok: false, message: data.error || 'Test failed', elapsedMs: data.elapsedMs })
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message || 'Test failed' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-mist/20 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-3" />
          <p className="text-brand-steel text-sm">Loading settings…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-mist/20">
      <div className="h-[72px] px-6 border-b border-brand-border flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-brand-mist rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-brand-ink" />
          </button>
          <h1 className="text-xl font-bold text-brand-ink">Settings</h1>
        </div>
        <Button
          onClick={save}
          loading={saving}
          disabled={!dirty && !apiKey.trim() && !embDirty && !embApiKey.trim()}
          icon={<Save className="w-4 h-4" />}
        >
          Save
        </Button>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <section className="rounded-xl border border-brand-border bg-white shadow-soft p-6">
          <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium mb-1">Unified Agent</div>
          <h2 className="text-lg font-semibold text-brand-ink">One model powers everything</h2>
          <p className="text-sm text-brand-steel mt-1">Parse JDs, generate/tailor resumes and cover letters, run ATS evals, chat with Scout, and drive the Apply Agent — all from this single provider + model.</p>

          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="text-xs font-medium text-brand-slate">Service</span>
              <select
                value={serviceId}
                onChange={e => onServiceChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              >
                {SERVICES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>

            {(serviceId === 'ollama' || serviceId === 'lmstudio') && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <div className="font-semibold">
                      {serviceId === 'ollama' ? 'Ollama must be running locally' : 'LM Studio must be running and a model must be loaded'}
                    </div>
                    {serviceId === 'ollama' ? (
                      <div className="text-xs leading-relaxed">
                        The app connects to <code className="font-mono bg-white/60 px-1 rounded">http://localhost:11434</code>. Before using any AI feature, make sure Ollama is serving and the model is pulled:
                        <ul className="mt-1.5 list-disc pl-4 space-y-0.5">
                          <li><code className="font-mono bg-white/60 px-1 rounded">ollama serve</code> — starts the API</li>
                          <li><code className="font-mono bg-white/60 px-1 rounded">ollama pull {'<model>'}</code> — downloads the model</li>
                          <li>Or run it once: <code className="font-mono bg-white/60 px-1 rounded">ollama run {'<model>'}</code></li>
                        </ul>
                        The first call after a cold start loads the model into memory and may take 10–30 s — the app does not trigger loading, you control it.
                      </div>
                    ) : (
                      <div className="text-xs leading-relaxed">
                        The app connects to <code className="font-mono bg-white/60 px-1 rounded">http://localhost:1234</code>. In LM Studio:
                        <ol className="mt-1.5 list-decimal pl-4 space-y-0.5">
                          <li>Open the <span className="font-medium">Developer</span> tab (or the <span className="font-medium">Local Server</span> tab on older versions)</li>
                          <li>Pick the model you want and click <span className="font-medium">Load</span></li>
                          <li>Click <span className="font-medium">Start Server</span></li>
                        </ol>
                        If no model is loaded in LM Studio, every AI call will fail. The app never auto-loads a model — that stays in your control.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="block">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-brand-slate">Model</span>
                <button
                  type="button"
                  onClick={() => refreshModels()}
                  disabled={modelsLoading}
                  className="text-xs text-brand-steel hover:text-brand-ink inline-flex items-center gap-1"
                  title="Fetch available models from the provider"
                >
                  <RefreshCw className={`w-3 h-3 ${modelsLoading ? 'animate-spin' : ''}`} />
                  {modelsLoading ? 'Fetching…' : 'Refresh'}
                </button>
              </div>
              <div className="mt-1">
                <ModelCombobox
                  value={model}
                  options={modelOptions}
                  loading={modelsLoading}
                  onChange={v => { setModel(v); setDirty(true); setTestResult(null) }}
                  placeholder="Search models…"
                />
              </div>
              {modelsError && (
                <span className="mt-1 block text-xs text-red-600">{modelsError}</span>
              )}
              {!modelsError && (
                <span className="mt-1 block text-xs text-brand-steel">
                  {modelsLoading
                    ? 'Fetching models…'
                    : modelOptions.length > 0
                    ? `${modelOptions.length} models available — type to filter`
                    : 'Save your API key to load available models.'}
                </span>
              )}
            </div>

            {service.authKind === 'apiKey' && (
              <label className="block">
                <span className="text-xs font-medium text-brand-slate">API key</span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setDirty(true); setTestResult(null) }}
                  placeholder={hasSavedKey ? '(saved — paste to replace)' : service.keyHint}
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent font-mono"
                />
                {hasSavedKey && !apiKey.trim() && (
                  <span className="mt-1 block text-xs text-brand-steel">A key is already saved for this service.</span>
                )}
              </label>
            )}

            {service.authKind === 'oauth' && service.oauthProvider && (
              <OAuthControl
                provider={service.oauthProvider}
                service={service}
                state={oauthState[service.oauthProvider]}
                onSignIn={() => signInOauth(service.oauthProvider!, service)}
                onSignOut={() => signOutOauth(service.oauthProvider!)}
              />
            )}

            {service.authKind === 'local' && (
              <div className="text-xs text-brand-steel">
                No authentication required. The local server at <code className="font-mono bg-brand-mist px-1 py-0.5 rounded">{service.baseUrl}</code> must be running and serving the chosen model.
              </div>
            )}

            <div className="flex items-center gap-3 pt-2 border-t border-brand-border">
              <Button
                variant="outline"
                size="sm"
                onClick={test}
                loading={testing}
                disabled={!model.trim() || (!apiKey.trim() && !hasSavedKey)}
                icon={<Play className="w-3.5 h-3.5" />}
              >
                Test connection
              </Button>
              {testResult && (
                <div
                  className={`flex items-center gap-2 text-xs ${testResult.ok ? 'text-emerald-700' : 'text-red-700'}`}
                >
                  {testResult.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span className="font-mono truncate max-w-md">{testResult.message}</span>
                  {testResult.elapsedMs !== undefined && (
                    <span className="text-brand-steel">· {testResult.elapsedMs} ms</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <SettingsAccordion label="Memory embeddings" hint="Ollama nomic-embed-text works out-of-the-box">
        <section className="rounded-xl border border-brand-border bg-white p-5">
          <p className="text-sm text-brand-steel">Used by the memory palace — stores verbatim past outputs and recalls them by similarity. Ollama with <code className="font-mono bg-brand-mist px-1 py-0.5 rounded">nomic-embed-text</code> is the free, local default.</p>

          <div className="mt-5 space-y-5">
            <label className="block">
              <span className="text-xs font-medium text-brand-slate">Provider</span>
              <select
                value={embProvider}
                onChange={e => {
                  const v = e.target.value as 'ollama' | 'openai-compatible'
                  setEmbProvider(v)
                  setEmbDirty(true)
                  if (v === 'ollama') {
                    setEmbBaseUrl('http://localhost:11434')
                    setEmbModel('nomic-embed-text')
                  } else {
                    setEmbBaseUrl('https://api.openai.com/v1')
                    setEmbModel('text-embedding-3-small')
                  }
                }}
                className="mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              >
                <option value="ollama">Ollama (local, free)</option>
                <option value="openai-compatible">OpenAI-compatible (hosted)</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-brand-slate">Base URL</span>
              <input
                type="text"
                value={embBaseUrl}
                onChange={e => { setEmbBaseUrl(e.target.value); setEmbDirty(true) }}
                className="mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink font-mono focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-brand-slate">Model</span>
              <input
                type="text"
                value={embModel}
                onChange={e => { setEmbModel(e.target.value); setEmbDirty(true) }}
                placeholder="nomic-embed-text"
                className="mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink font-mono focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </label>

            {embProvider === 'openai-compatible' && (
              <label className="block">
                <span className="text-xs font-medium text-brand-slate">API key</span>
                <input
                  type="password"
                  value={embApiKey}
                  onChange={e => { setEmbApiKey(e.target.value); setEmbDirty(true) }}
                  placeholder={embHasKey ? '(saved — paste to replace)' : 'sk-...'}
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink font-mono focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
                />
              </label>
            )}

            <div className="text-xs text-brand-steel pt-2 border-t border-brand-border">
              If the embeddings endpoint is unreachable, memory writes still succeed (verbatim content is preserved); they just won't be vector-searchable until the endpoint comes back.
            </div>
          </div>
        </section>
        </SettingsAccordion>

        {/* Everything below is secondary — collapsed by default. */}
        {onOpenMemory && (
          <button
            onClick={onOpenMemory}
            className="inline-flex w-full items-center justify-between rounded-xl border border-brand-border bg-white px-5 py-4 text-left text-sm font-semibold text-brand-ink transition hover:border-brand-ink hover:bg-brand-mist shadow-soft"
          >
            <span className="inline-flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Memory Palace
              <span className="font-normal text-brand-steel">— view + edit what the agent remembers</span>
            </span>
            <ChevronRight className="h-4 w-4 text-brand-steel" />
          </button>
        )}

        <SettingsAccordion label="Web search" hint="Tavily key + job portals Scout searches">
          <WebSearchSection />
        </SettingsAccordion>

        <SettingsAccordion label="Apply Agent" hint="browser-use install instructions">
          <ApplyAgentSection />
        </SettingsAccordion>

        <SettingsAccordion label="AI activity" hint="Every LLM call from the last 24 hours">
          <ActivitySection />
        </SettingsAccordion>

        <p className="text-xs text-brand-steel text-center">
          Config stored in <code className="font-mono bg-brand-mist px-1 py-0.5 rounded">data/app.db</code>.
          Per-feature overrides via <code className="font-mono bg-brand-mist px-1 py-0.5 rounded">.env</code>.
        </p>
      </div>
    </div>
  )
}

interface CallRow {
  id: number
  feature: string
  provider: string | null
  model: string | null
  prompt_preview: string | null
  response_preview: string | null
  input_tokens: number | null
  output_tokens: number | null
  elapsed_ms: number | null
  tool_calls_count: number | null
  finish_reason: string | null
  attempt: number | null
  error: string | null
  created_at: string
}

function SettingsAccordion({
  label,
  hint,
  children,
  defaultOpen,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details
      className="rounded-xl border border-brand-border bg-white shadow-soft overflow-hidden [&_summary::-webkit-details-marker]:hidden"
      open={defaultOpen}
    >
      <summary className="list-none flex items-center justify-between gap-3 cursor-pointer px-5 py-3 hover:bg-brand-mist/60 transition-colors duration-150">
        <div>
          <div className="text-sm font-semibold text-brand-ink">{label}</div>
          {hint && <div className="text-xs text-brand-steel mt-0.5">{hint}</div>}
        </div>
        <ChevronDown className="h-4 w-4 text-brand-steel shrink-0 transition-transform duration-150 group-open:rotate-180 details-arrow" />
      </summary>
      <div className="border-t border-brand-border p-4 bg-brand-mist/20 animate-fade-in">
        {children}
      </div>
    </details>
  )
}

function OAuthControl({
  provider,
  service,
  state,
  onSignIn,
  onSignOut,
}: {
  provider: 'openai_codex'
  service: ServiceOptionExt
  state: { signedIn: boolean; accountEmail: string | null; accountName: string | null; busy: boolean }
  onSignIn: () => void
  onSignOut: () => void
}) {
  return (
    <div className="space-y-3">
      {service.warning && !state.signedIn && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
          <strong>{service.warning}</strong>
        </div>
      )}
      {state.signedIn ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-[10px] uppercase tracking-wider text-emerald-800 font-semibold">Signed in</div>
          <div className="mt-1 text-sm text-brand-ink">
            {state.accountEmail || state.accountName || '(account)'}
          </div>
          <button
            onClick={onSignOut}
            className="mt-2 text-xs text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
          >
            Sign out
          </button>
        </div>
      ) : (
        <button
          onClick={onSignIn}
          disabled={state.busy}
          className="inline-flex items-center gap-2 rounded-full bg-brand-ink px-4 py-2 text-sm font-semibold text-white hover:bg-brand-slate disabled:opacity-60"
        >
          {state.busy ? (
            <>
              <Spinner size="sm" />
              Waiting for browser…
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Sign in with ChatGPT
            </>
          )}
        </button>
      )}
    </div>
  )
}

function ApplyAgentSection() {
  return (
    <section className="rounded-xl border border-brand-border bg-white shadow-soft p-6">
      <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium mb-1">Apply Agent</div>
      <h2 className="text-lg font-semibold text-brand-ink">Powered by browser-use</h2>
      <p className="text-sm text-brand-steel mt-1">
        The Apply Agent delegates to{' '}
        <a
          href="https://github.com/browser-use/browser-use"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-ink font-medium underline underline-offset-2"
        >
          browser-use
        </a>{' '}
        — an open-source browser agent connected to whichever model you picked above. The Chromium window is always visible; you watch every action and approve the final submit yourself.
      </p>

      <div className="mt-4 rounded-lg border border-brand-border bg-brand-mist/40 p-3 text-xs text-brand-slate">
        <div className="text-brand-ink uppercase tracking-wider text-[10px] font-semibold mb-1">Provider mapping</div>
        <p className="leading-relaxed">
          The app auto-picks the best <code className="font-mono bg-white px-1 py-0.5 rounded border border-brand-border">browser_use.ChatXxx</code> class for your selected service:
        </p>
        <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono">
          <li>Anthropic → <span className="text-brand-ink">ChatAnthropic</span></li>
          <li>Google → <span className="text-brand-ink">ChatGoogle</span></li>
          <li>OpenAI → <span className="text-brand-ink">ChatOpenAI</span></li>
          <li>Mistral → <span className="text-brand-ink">ChatMistral</span></li>
          <li>Groq → <span className="text-brand-ink">ChatGroq</span></li>
          <li>DeepSeek → <span className="text-brand-ink">ChatDeepSeek</span></li>
          <li>OpenRouter → <span className="text-brand-ink">ChatOpenRouter</span></li>
          <li>Cerebras → <span className="text-brand-ink">ChatCerebras</span></li>
          <li>Ollama → <span className="text-brand-ink">ChatOllama</span></li>
          <li>LM Studio → <span className="text-brand-ink">ChatOpenAI</span> (OAI-compat)</li>
        </ul>
      </div>

      <div className="mt-4 rounded-lg border border-brand-border bg-brand-mist/40 p-3 text-xs text-brand-slate space-y-2 font-mono">
        <div className="text-brand-ink uppercase tracking-wider text-[10px] font-sans font-semibold">One-time install</div>
        <div>1. Python 3.11+: <code className="bg-white px-1 py-0.5 rounded border border-brand-border">python3 --version</code></div>
        <div>2. Create a dedicated venv so deps don't pollute your system Python:</div>
        <pre className="bg-white border border-brand-border rounded p-2 whitespace-pre-wrap break-all">python3 -m venv scripts/.venv
scripts/.venv/bin/pip install -r scripts/requirements.txt
scripts/.venv/bin/python -m playwright install chromium</pre>
        <div className="!font-sans">The app auto-detects <code className="font-mono bg-white px-1 py-0.5 rounded border border-brand-border">scripts/.venv/bin/python</code>, then falls back to python3.11/3.12/3.13 on PATH. Override with <code className="font-mono bg-white px-1 py-0.5 rounded border border-brand-border">PYTHON_BIN=/path/to/python</code> if needed.</div>
      </div>
    </section>
  )
}

function WebSearchSection() {
  const { showToast } = useToast()
  const [tavilyKey, setTavilyKey] = useState('')
  const [braveKey, setBraveKey] = useState('')
  const [hasTavily, setHasTavily] = useState(false)
  const [hasBrave, setHasBrave] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [portals, setPortals] = useState<string[]>([])
  const [portalsAreDefault, setPortalsAreDefault] = useState(true)
  const [defaultPortals, setDefaultPortals] = useState<string[]>([])
  const [newPortal, setNewPortal] = useState('')
  const [portalsDirty, setPortalsDirty] = useState(false)

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setHasTavily(!!data.webSearch?.hasTavilyKey)
      setHasBrave(!!data.webSearch?.hasBraveKey)
      setPortals(Array.isArray(data.webSearch?.jobPortals) ? data.webSearch.jobPortals : [])
      setPortalsAreDefault(!!data.webSearch?.jobPortalsIsDefault)
      setDefaultPortals(Array.isArray(data.webSearch?.defaultJobPortals) ? data.webSearch.defaultJobPortals : [])
    } catch { /* noop */ }
  }

  useEffect(() => { loadSettings() }, [])

  const save = async () => {
    setSaving(true)
    try {
      const body: any = { webSearch: {} }
      if (tavilyKey.trim()) body.webSearch.tavilyApiKey = tavilyKey.trim()
      if (braveKey.trim()) body.webSearch.braveApiKey = braveKey.trim()
      if (portalsDirty) body.webSearch.jobPortals = portals
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Save failed')
      if (tavilyKey.trim()) { setTavilyKey(''); setHasTavily(true) }
      if (braveKey.trim()) { setBraveKey(''); setHasBrave(true) }
      setDirty(false)
      setPortalsDirty(false)
      showToast('success', 'Web search settings saved')
      await loadSettings()
    } catch (e: any) {
      showToast('error', e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const normalizeDomain = (raw: string) =>
    raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')

  const addPortal = () => {
    const d = normalizeDomain(newPortal)
    if (!d) return
    if (portals.includes(d)) {
      showToast('error', `${d} is already in the list`)
      return
    }
    setPortals(p => [...p, d])
    setNewPortal('')
    setPortalsDirty(true)
  }

  const removePortal = (d: string) => {
    setPortals(p => p.filter(x => x !== d))
    setPortalsDirty(true)
  }

  const resetPortals = async () => {
    if (!confirm('Reset the job portal list to defaults?')) return
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webSearch: { jobPortals: [] } }),
      })
      if (!res.ok) throw new Error('Reset failed')
      showToast('success', 'Restored default portals')
      await loadSettings()
      setPortalsDirty(false)
    } catch (e: any) {
      showToast('error', e?.message || 'Reset failed')
    }
  }

  return (
    <section className="rounded-xl border border-brand-border bg-white shadow-soft p-6">
      <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium mb-1">Web Search</div>
      <h2 className="text-lg font-semibold text-brand-ink">Live search backends</h2>
      <p className="text-sm text-brand-steel mt-1">
        Powers Scout's job-finding + any agent web lookup. First key with a value wins: <strong>Tavily → Brave → DuckDuckGo</strong> (free, no key). Tavily's day/week freshness filter is the richest — recommended.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-brand-slate">Tavily API key</span>
          <input
            type="password"
            value={tavilyKey}
            onChange={e => { setTavilyKey(e.target.value); setDirty(true) }}
            placeholder={hasTavily ? '(saved — paste to replace)' : 'tvly-...'}
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent font-mono"
          />
          <span className="mt-1 block text-xs text-brand-steel">
            Free tier = 1000 searches/month at <code className="font-mono bg-brand-mist px-1 py-0.5 rounded">tavily.com</code>.
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-brand-slate">Brave Search API key (optional fallback)</span>
          <input
            type="password"
            value={braveKey}
            onChange={e => { setBraveKey(e.target.value); setDirty(true) }}
            placeholder={hasBrave ? '(saved — paste to replace)' : 'BSA...'}
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent font-mono"
          />
        </label>

        <div className="flex items-center gap-3 pt-2 border-t border-brand-border">
          <Button size="sm" onClick={save} loading={saving} disabled={!dirty && !portalsDirty && !tavilyKey.trim() && !braveKey.trim()} icon={<Save className="w-3.5 h-3.5" />}>
            Save
          </Button>
          <div className="text-xs text-brand-steel">
            Without a key, the app falls back to DuckDuckGo (no freshness filter).
          </div>
        </div>

        <div className="pt-4 border-t border-brand-border">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs font-medium text-brand-slate">Job portals</div>
              <p className="text-xs text-brand-steel mt-0.5">
                When Scout does a job search, it scopes results to these domains (Tavily <code className="font-mono bg-brand-mist px-1 py-0.5 rounded">include_domains</code>). {portalsAreDefault ? 'Using the built-in defaults.' : 'Custom list.'}
              </p>
            </div>
            {!portalsAreDefault && (
              <button
                type="button"
                onClick={resetPortals}
                className="text-xs text-brand-steel hover:text-brand-ink underline underline-offset-2"
              >
                Reset to defaults
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {portals.map(d => (
              <span key={d} className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-white px-2.5 py-1 text-xs font-mono text-brand-slate">
                {d}
                <button
                  type="button"
                  onClick={() => removePortal(d)}
                  className="ml-0.5 text-brand-steel hover:text-red-700"
                  aria-label={`Remove ${d}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newPortal}
              onChange={e => setNewPortal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPortal() } }}
              placeholder="e.g. stepstone.de"
              className="flex-1 rounded-lg border border-brand-border bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
            />
            <Button size="sm" variant="outline" onClick={addPortal} disabled={!newPortal.trim()}>
              Add
            </Button>
          </div>

          {defaultPortals.length > 0 && portals.length === 0 && (
            <div className="mt-3 text-xs text-brand-steel">
              List is empty — Scout will search the open web. Add at least one domain or reset to defaults.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ActivitySection() {
  const [rows, setRows] = useState<CallRow[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [errorsOnly, setErrorsOnly] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/telemetry/llm-calls?limit=25${errorsOnly ? '&errors=1' : ''}`)
      const data = await res.json()
      setRows(data.rows || [])
      setSummary(data.summary || null)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorsOnly])

  return (
    <section className="rounded-xl border border-brand-border bg-white shadow-soft p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-brand-steel font-medium mb-1">Telemetry</div>
          <h2 className="text-lg font-semibold text-brand-ink inline-flex items-center gap-2">
            <Activity className="w-4 h-4" /> AI Activity
          </h2>
          <p className="text-sm text-brand-steel mt-1">Every LLM call from the last 24 hours — latency, tokens, errors.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-brand-slate cursor-pointer">
            <input type="checkbox" checked={errorsOnly} onChange={e => setErrorsOnly(e.target.checked)} />
            Errors only
          </label>
          <button
            onClick={load}
            className="inline-flex items-center gap-1 text-xs text-brand-steel hover:text-brand-ink"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {summary?.totals && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="rounded-lg border border-brand-border bg-brand-mist/40 px-3 py-2">
            <div className="text-[10px] uppercase text-brand-steel">Calls (24h)</div>
            <div className="text-lg font-semibold text-brand-ink">{summary.totals.calls ?? 0}</div>
          </div>
          <div className="rounded-lg border border-brand-border bg-brand-mist/40 px-3 py-2">
            <div className="text-[10px] uppercase text-brand-steel">Errors</div>
            <div className={`text-lg font-semibold ${summary.totals.errors ? 'text-red-700' : 'text-brand-ink'}`}>
              {summary.totals.errors ?? 0}
            </div>
          </div>
          <div className="rounded-lg border border-brand-border bg-brand-mist/40 px-3 py-2">
            <div className="text-[10px] uppercase text-brand-steel">Avg ms</div>
            <div className="text-lg font-semibold text-brand-ink">{summary.totals.avg_ms ?? '—'}</div>
          </div>
          <div className="rounded-lg border border-brand-border bg-brand-mist/40 px-3 py-2">
            <div className="text-[10px] uppercase text-brand-steel">Tokens out</div>
            <div className="text-lg font-semibold text-brand-ink">{summary.totals.output_tokens ?? 0}</div>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-sm text-brand-steel py-4 text-center">No calls yet.</div>
      ) : (
        <div className="space-y-1">
          {rows.map(r => (
            <div key={r.id} className="rounded-lg border border-brand-border bg-white">
              <button
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-brand-mist/40"
              >
                <span className={`inline-flex w-2 h-2 rounded-full ${r.error ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <span className="text-xs font-mono text-brand-ink min-w-[140px]">{r.feature}</span>
                <span className="text-[10px] text-brand-steel truncate flex-1">{r.model || '—'}</span>
                <span className="text-[10px] font-mono text-brand-steel whitespace-nowrap">{r.elapsed_ms ?? '—'}ms</span>
                <span className="text-[10px] font-mono text-brand-steel whitespace-nowrap">
                  {r.input_tokens ?? 0}→{r.output_tokens ?? 0}
                </span>
                {(r.attempt ?? 1) > 1 && (
                  <span className="text-[10px] font-mono text-amber-700 whitespace-nowrap">
                    attempt {r.attempt}
                  </span>
                )}
                <span className="text-[10px] text-brand-steel whitespace-nowrap">
                  {new Date(r.created_at + 'Z').toLocaleTimeString()}
                </span>
              </button>
              {expanded === r.id && (
                <div className="border-t border-brand-border px-3 py-2 space-y-2 text-xs">
                  {r.error && (
                    <div className="rounded bg-red-50 border border-red-200 px-2 py-1 font-mono text-red-900">
                      {r.error}
                    </div>
                  )}
                  {r.prompt_preview && (
                    <div>
                      <div className="text-[10px] uppercase text-brand-steel mb-1">Prompt (last message)</div>
                      <pre className="bg-brand-mist/40 rounded px-2 py-1 whitespace-pre-wrap font-sans text-brand-slate">{r.prompt_preview}</pre>
                    </div>
                  )}
                  {r.response_preview && (
                    <div>
                      <div className="text-[10px] uppercase text-brand-steel mb-1">Response</div>
                      <pre className="bg-brand-mist/40 rounded px-2 py-1 whitespace-pre-wrap font-sans text-brand-slate">{r.response_preview}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
