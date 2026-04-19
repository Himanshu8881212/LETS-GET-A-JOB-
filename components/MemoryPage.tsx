'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Brain,
  Edit3,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from './ui/Button'
import { Spinner } from './ui/Spinner'
import { useToast } from './ui/Toast'

interface MemoryPageProps {
  onBack: () => void
}

interface ApiItem {
  id: number
  wing: string
  room: string | null
  drawer: string | null
  content: string
  metadata: Record<string, unknown> | null
  outcomeScore: number | null
  validFrom: string
  validUntil: string | null
  createdAt: string
}

interface ApiFact {
  id: number
  subject: string
  predicate: string
  object: string
  confidence: number
  source?: 'manual' | 'chat' | 'profile' | 'inferred' | 'unknown'
  validFrom: string
  validUntil: string | null
}

interface Counts {
  counts: Array<{ wing: string; count: number }>
  facts: ApiFact[]
}

type Tab = 'items' | 'facts'

export default function MemoryPage({ onBack }: MemoryPageProps) {
  const { showToast } = useToast()
  const [tab, setTab] = useState<Tab>('items')
  const [summary, setSummary] = useState<Counts | null>(null)
  const [items, setItems] = useState<ApiItem[]>([])
  const [total, setTotal] = useState(0)
  const [wingFilter, setWingFilter] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [vectorQ, setVectorQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newItem, setNewItem] = useState({ wing: 'profile', drawer: '', content: '', outcomeScore: '' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<ApiItem>>({})

  const [newFact, setNewFact] = useState({ subject: 'user', predicate: '', object: '' })
  const [editingFactId, setEditingFactId] = useState<number | null>(null)
  const [factDraft, setFactDraft] = useState<Partial<ApiFact>>({})

  const loadSummary = async () => {
    const res = await fetch('/api/memory')
    if (!res.ok) throw new Error('Failed to load summary')
    return (await res.json()) as Counts
  }

  const loadItems = async () => {
    const params = new URLSearchParams({ list: '1', limit: '100' })
    if (wingFilter) params.set('wing', wingFilter)
    if (searchQ.trim()) params.set('search', searchQ.trim())
    const res = await fetch(`/api/memory?${params}`)
    if (!res.ok) throw new Error('Failed to load items')
    return (await res.json()) as { items: ApiItem[]; total: number }
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      const [s, list] = await Promise.all([loadSummary(), loadItems()])
      setSummary(s)
      setItems(list.items)
      setTotal(list.total)
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to load memory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doVectorSearch = async () => {
    if (!vectorQ.trim()) return loadAll()
    setLoading(true)
    try {
      const params = new URLSearchParams({ q: vectorQ.trim(), limit: '20' })
      if (wingFilter) params.set('wing', wingFilter)
      const res = await fetch(`/api/memory?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      // Repack hits into item shape
      const asItems: ApiItem[] = (data.hits || []).map((h: any) => ({
        id: h.id,
        wing: h.wing,
        room: h.room ?? null,
        drawer: h.drawer ?? null,
        content: h.content,
        metadata: null,
        outcomeScore: h.outcomeScore ?? null,
        validFrom: h.validFrom ?? new Date().toISOString(),
        validUntil: h.validUntil ?? null,
        createdAt: h.createdAt ?? new Date().toISOString(),
      }))
      setItems(asItems)
      setTotal(asItems.length)
    } catch (e: any) {
      showToast('error', e?.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const createItem = async () => {
    if (!newItem.content.trim() || !newItem.wing.trim()) {
      return showToast('error', 'Wing and content are required')
    }
    setCreating(true)
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wing: newItem.wing.trim(),
          drawer: newItem.drawer.trim() || null,
          content: newItem.content.trim(),
          outcomeScore: newItem.outcomeScore ? Number(newItem.outcomeScore) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      showToast('success', 'Memory added')
      setNewItem({ wing: 'profile', drawer: '', content: '', outcomeScore: '' })
      loadAll()
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to save')
    } finally {
      setCreating(false)
    }
  }

  const saveEdit = async (id: number) => {
    try {
      const res = await fetch(`/api/memory/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wing: editDraft.wing,
          drawer: editDraft.drawer,
          content: editDraft.content,
          outcomeScore: editDraft.outcomeScore,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Update failed')
      }
      showToast('success', 'Updated')
      setEditingId(null)
      setEditDraft({})
      loadAll()
    } catch (e: any) {
      showToast('error', e?.message || 'Update failed')
    }
  }

  const deleteItem = async (id: number) => {
    if (!confirm('Delete this memory item? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/memory/items/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      showToast('success', 'Deleted')
      loadAll()
    } catch (e: any) {
      showToast('error', e?.message || 'Delete failed')
    }
  }

  const addFact = async () => {
    if (!newFact.predicate.trim() || !newFact.object.trim()) {
      return showToast('error', 'Predicate and object are required')
    }
    try {
      const res = await fetch('/api/memory/facts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newFact.subject.trim() || 'user',
          predicate: newFact.predicate.trim(),
          object: newFact.object.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed')
      }
      showToast('success', 'Fact added')
      setNewFact({ subject: 'user', predicate: '', object: '' })
      loadAll()
    } catch (e: any) {
      showToast('error', e?.message || 'Failed')
    }
  }

  const saveFactEdit = async (id: number) => {
    try {
      const res = await fetch(`/api/memory/facts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ object: factDraft.object }),
      })
      if (!res.ok) throw new Error('Update failed')
      setEditingFactId(null)
      setFactDraft({})
      loadAll()
    } catch (e: any) {
      showToast('error', e?.message || 'Update failed')
    }
  }

  const deleteFact = async (id: number) => {
    if (!confirm('Delete this fact? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/memory/facts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      loadAll()
    } catch (e: any) {
      showToast('error', e?.message || 'Delete failed')
    }
  }

  const wings = useMemo(() => summary?.counts.map(c => c.wing) || [], [summary])

  return (
    <div className="flex-1 bg-brand-mist/20 flex flex-col h-full overflow-hidden">
      <div className="h-[72px] px-6 border-b border-brand-border flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-brand-mist rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-brand-ink" />
          </button>
          <div>
            <h2 className="font-display font-bold text-brand-ink leading-tight flex items-center gap-2">
              <Brain className="w-5 h-5" /> Memory Palace
            </h2>
            <p className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">
              Everything the agent remembers about you
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-full border border-brand-border bg-white p-1 shadow-sm">
            <button
              onClick={() => setTab('items')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${tab === 'items' ? 'bg-brand-ink text-white' : 'text-brand-steel hover:text-brand-ink'}`}
            >
              Items ({summary?.counts.reduce((a, c) => a + c.count, 0) ?? 0})
            </button>
            <button
              onClick={() => setTab('facts')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${tab === 'facts' ? 'bg-brand-ink text-white' : 'text-brand-steel hover:text-brand-ink'}`}
            >
              Facts ({summary?.facts.length ?? 0})
            </button>
          </div>
          <DeleteEverythingButton onDone={loadAll} showToast={showToast} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
          {/* Summary strip */}
          {summary && summary.counts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setWingFilter(''); loadAll() }}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${wingFilter === '' ? 'border-brand-ink bg-brand-ink text-white' : 'border-brand-border bg-white text-brand-slate hover:border-brand-ink'}`}
              >
                All · {summary.counts.reduce((a, c) => a + c.count, 0)}
              </button>
              {summary.counts.map(c => (
                <button
                  key={c.wing}
                  onClick={() => { setWingFilter(c.wing); }}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${wingFilter === c.wing ? 'border-brand-ink bg-brand-ink text-white' : 'border-brand-border bg-white text-brand-slate hover:border-brand-ink'}`}
                >
                  {c.wing} · {c.count}
                </button>
              ))}
            </div>
          )}

          {tab === 'items' && (
            <>
              {/* Search row */}
              <div className="rounded-xl border border-brand-border bg-white p-4 shadow-soft grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <label className="flex items-center gap-2 rounded-lg border border-brand-border px-3">
                  <Search className="w-4 h-4 text-brand-steel" />
                  <input
                    type="text"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadAll()}
                    placeholder="Substring search…"
                    className="flex-1 py-2 text-sm bg-transparent focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-brand-border px-3">
                  <Brain className="w-4 h-4 text-brand-steel" />
                  <input
                    type="text"
                    value={vectorQ}
                    onChange={e => setVectorQ(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && doVectorSearch()}
                    placeholder="Semantic vector search…"
                    className="flex-1 py-2 text-sm bg-transparent focus:outline-none"
                  />
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadAll} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                    Reload
                  </Button>
                  {vectorQ && (
                    <Button size="sm" onClick={doVectorSearch}>
                      Search
                    </Button>
                  )}
                </div>
              </div>

              {/* Create */}
              <details className="rounded-xl border border-brand-border bg-white p-4 shadow-soft">
                <summary className="cursor-pointer text-sm font-semibold text-brand-ink inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add memory manually
                </summary>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <input
                    value={newItem.wing}
                    onChange={e => setNewItem(n => ({ ...n, wing: e.target.value }))}
                    placeholder="wing (profile, style, …)"
                    className="rounded-lg border border-brand-border px-3 py-2 text-sm font-mono"
                  />
                  <input
                    value={newItem.drawer}
                    onChange={e => setNewItem(n => ({ ...n, drawer: e.target.value }))}
                    placeholder="drawer (optional)"
                    className="rounded-lg border border-brand-border px-3 py-2 text-sm font-mono"
                  />
                  <input
                    value={newItem.outcomeScore}
                    onChange={e => setNewItem(n => ({ ...n, outcomeScore: e.target.value }))}
                    placeholder="outcome 0–10 (optional)"
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    className="rounded-lg border border-brand-border px-3 py-2 text-sm font-mono"
                  />
                  <Button onClick={createItem} loading={creating} icon={<Save className="w-4 h-4" />}>
                    Save
                  </Button>
                </div>
                <textarea
                  value={newItem.content}
                  onChange={e => setNewItem(n => ({ ...n, content: e.target.value }))}
                  placeholder="Verbatim content. Paste a winning bullet, a preference, a company insight — anything worth remembering."
                  rows={4}
                  className="mt-3 w-full rounded-lg border border-brand-border px-3 py-2 text-sm"
                />
              </details>

              {/* Items list */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Spinner size="lg" />
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-xl border border-brand-border bg-white p-10 text-center">
                  <Brain className="mx-auto w-10 h-10 text-brand-steel" />
                  <p className="mt-3 text-sm text-brand-slate">No memory items yet{wingFilter ? ` in "${wingFilter}"` : ''}.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-brand-steel">{total} item{total === 1 ? '' : 's'}</p>
                  {items.map(item => (
                    <div key={item.id} className="rounded-xl border border-brand-border bg-white p-4 shadow-soft">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center rounded-full bg-brand-ink px-2.5 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
                            {item.wing}
                          </span>
                          {item.drawer && (
                            <span className="inline-flex items-center rounded-full border border-brand-border px-2.5 py-0.5 text-[10px] font-medium text-brand-slate">
                              {item.drawer}
                            </span>
                          )}
                          {item.outcomeScore != null && (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                              outcome {item.outcomeScore.toFixed(1)}
                            </span>
                          )}
                          <span className="text-[11px] text-brand-steel">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingId(item.id)
                              setEditDraft({ wing: item.wing, drawer: item.drawer, content: item.content, outcomeScore: item.outcomeScore })
                            }}
                            className="p-1.5 text-brand-steel hover:text-brand-ink hover:bg-brand-mist rounded"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-1.5 text-brand-steel hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {editingId === item.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              value={editDraft.wing || ''}
                              onChange={e => setEditDraft(d => ({ ...d, wing: e.target.value }))}
                              className="rounded-lg border border-brand-border px-2 py-1 text-xs font-mono"
                              placeholder="wing"
                            />
                            <input
                              value={editDraft.drawer || ''}
                              onChange={e => setEditDraft(d => ({ ...d, drawer: e.target.value }))}
                              className="rounded-lg border border-brand-border px-2 py-1 text-xs font-mono"
                              placeholder="drawer"
                            />
                            <input
                              type="number"
                              step={0.1}
                              min={0}
                              max={10}
                              value={editDraft.outcomeScore ?? ''}
                              onChange={e => setEditDraft(d => ({ ...d, outcomeScore: e.target.value === '' ? null : Number(e.target.value) }))}
                              className="rounded-lg border border-brand-border px-2 py-1 text-xs font-mono"
                              placeholder="outcome"
                            />
                          </div>
                          <textarea
                            value={editDraft.content || ''}
                            onChange={e => setEditDraft(d => ({ ...d, content: e.target.value }))}
                            rows={6}
                            className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEdit(item.id)} icon={<Save className="w-3.5 h-3.5" />}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditDraft({}) }} icon={<X className="w-3.5 h-3.5" />}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap text-sm text-brand-slate font-sans leading-relaxed">{item.content}</pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'facts' && (
            <>
              <CleanupBar onCleanup={loadAll} />
              <details className="rounded-xl border border-brand-border bg-white p-4 shadow-soft" open>
                <summary className="cursor-pointer text-sm font-semibold text-brand-ink inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add fact
                </summary>
                <div className="mt-4 grid gap-3 md:grid-cols-[auto_auto_1fr_auto]">
                  <input
                    value={newFact.subject}
                    onChange={e => setNewFact(f => ({ ...f, subject: e.target.value }))}
                    placeholder="subject"
                    className="rounded-lg border border-brand-border px-3 py-2 text-sm font-mono"
                  />
                  <input
                    value={newFact.predicate}
                    onChange={e => setNewFact(f => ({ ...f, predicate: e.target.value }))}
                    placeholder="predicate (target_role, …)"
                    className="rounded-lg border border-brand-border px-3 py-2 text-sm font-mono"
                  />
                  <input
                    value={newFact.object}
                    onChange={e => setNewFact(f => ({ ...f, object: e.target.value }))}
                    placeholder="value"
                    className="rounded-lg border border-brand-border px-3 py-2 text-sm"
                  />
                  <Button onClick={addFact} icon={<Save className="w-4 h-4" />}>
                    Save
                  </Button>
                </div>
                <p className="mt-2 text-xs text-brand-steel">
                  Use subject=<code className="font-mono bg-brand-mist px-1 py-0.5 rounded">user</code> for anything about you. A new value for the same predicate supersedes the old one (kept in history, not deleted).
                </p>
              </details>

              {summary?.facts.length === 0 ? (
                <div className="rounded-xl border border-brand-border bg-white p-10 text-center">
                  <Brain className="mx-auto w-10 h-10 text-brand-steel" />
                  <p className="mt-3 text-sm text-brand-slate">No facts yet. Add a few to prime the agent.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-brand-border bg-white overflow-hidden shadow-soft">
                  <table className="w-full text-sm">
                    <thead className="bg-brand-mist text-brand-steel uppercase tracking-[0.18em] text-[10px]">
                      <tr>
                        <th className="px-4 py-2 text-left">Subject</th>
                        <th className="px-4 py-2 text-left">Predicate</th>
                        <th className="px-4 py-2 text-left">Value</th>
                        <th className="px-4 py-2 text-left">Source</th>
                        <th className="px-4 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {summary?.facts.map(f => (
                        <tr key={f.id} className="hover:bg-brand-mist/50">
                          <td className="px-4 py-2 font-mono text-xs">{f.subject}</td>
                          <td className="px-4 py-2 font-mono text-xs">{f.predicate}</td>
                          <td className="px-4 py-2">
                            {editingFactId === f.id ? (
                              <input
                                value={factDraft.object || ''}
                                onChange={e => setFactDraft(d => ({ ...d, object: e.target.value }))}
                                className="w-full rounded border border-brand-border px-2 py-1 text-sm"
                                autoFocus
                              />
                            ) : (
                              f.object
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <SourceBadge source={f.source} />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex justify-end gap-1">
                              {editingFactId === f.id ? (
                                <>
                                  <button
                                    onClick={() => saveFactEdit(f.id)}
                                    className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => { setEditingFactId(null); setFactDraft({}) }}
                                    className="p-1 text-brand-steel hover:bg-brand-mist rounded"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => { setEditingFactId(f.id); setFactDraft({ object: f.object }) }}
                                    className="p-1 text-brand-steel hover:text-brand-ink hover:bg-brand-mist rounded"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteFact(f.id)}
                                    className="p-1 text-brand-steel hover:text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DeleteEverythingButton({
  onDone,
  showToast,
}: {
  onDone: () => void
  showToast: (kind: 'success' | 'error', msg: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const wipe = async () => {
    const ok = confirm(
      'Delete EVERYTHING in the memory palace?\n\n' +
      'This wipes every memory item, every fact, every seen-link. It cannot be undone.\n\n' +
      'Continue?'
    )
    if (!ok) return
    const confirmPhrase = prompt('Type "delete everything" to confirm:')
    if ((confirmPhrase || '').trim().toLowerCase() !== 'delete everything') {
      showToast('error', 'Confirmation mismatch — nothing deleted.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/memory/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'delete-everything' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      showToast('success', `Cleared ${data.deletedItems} items + ${data.deletedFacts} facts.`)
      onDone()
    } catch (e: any) {
      showToast('error', e?.message || 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={wipe}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:border-red-400 hover:bg-red-100 disabled:opacity-60"
      title="Wipe the entire memory palace"
    >
      <Trash2 className="w-3.5 h-3.5" />
      {busy ? 'Deleting…' : 'Delete everything'}
    </button>
  )
}

function SourceBadge({ source }: { source?: ApiFact['source'] }) {
  const s = source || 'unknown'
  const style: Record<string, string> = {
    manual: 'bg-brand-ink text-white',
    chat: 'bg-emerald-100 text-emerald-900 border border-emerald-200',
    profile: 'bg-amber-100 text-amber-900 border border-amber-200',
    inferred: 'bg-brand-mist text-brand-slate border border-brand-border',
    unknown: 'bg-white text-brand-steel border border-brand-border',
  }
  const label: Record<string, string> = {
    manual: 'manual',
    chat: 'chat',
    profile: 'profile',
    inferred: 'inferred',
    unknown: 'legacy',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style[s]}`}>
      {label[s]}
    </span>
  )
}

function CleanupBar({ onCleanup }: { onCleanup: () => void }) {
  const [busy, setBusy] = useState(false)
  const { showToast } = useToast()
  const wipeProfile = async () => {
    if (!confirm('Delete all facts that were auto-extracted from profile JSON? Useful after testing with sample profiles. Facts you typed into chat or the Memory UI are kept.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/memory/facts/wipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'profile', subject: 'user' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      onCleanup()
    } catch (e: any) {
      showToast('error', e?.message || 'Cleanup failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm flex items-start justify-between gap-3">
      <div className="text-amber-900">
        <strong>Reset sample-profile facts:</strong> If you ran a resume/cover-letter generation with sample data and it polluted your facts, clear the auto-extracted profile entries. Your chat and manual entries stay.
      </div>
      <button
        onClick={wipeProfile}
        disabled={busy}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:border-amber-500 disabled:opacity-60"
      >
        {busy ? 'Clearing…' : 'Clear profile-derived facts'}
      </button>
    </div>
  )
}
