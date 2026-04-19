'use client'

import { useState } from 'react'
import { Wand2 } from 'lucide-react'
import { Spinner } from './Spinner'
import { useToast } from './Toast'

/**
 * Magic-wand button — polishes one section of a resume or cover letter.
 * Hands the current content to /api/ai/polish-section, hands back the
 * polished version via the onPolished callback.
 *
 * For bullet-array sections (kind ends with `_bullets`), pass `content`
 * as a JSON-stringified array and expect the polished result to also be
 * a JSON array string; callers parse it on their side.
 */
export interface WandButtonProps {
  kind:
    | 'resume_summary'
    | 'resume_experience_bullet'
    | 'resume_experience_bullets'
    | 'resume_project_description'
    | 'resume_project_bullets'
    | 'resume_education_description'
    | 'cover_letter_opening'
    | 'cover_letter_body'
    | 'cover_letter_closing'
  /** Current content to polish. Empty string disables the button. */
  content: string
  /** Optional job description / role to tailor the polish toward. */
  context?: {
    jobDescription?: string
    targetRole?: string
    companyName?: string
  }
  /** Called with the polished text (parse JSON yourself for *_bullets kinds). */
  onPolished: (polished: string) => void
  /** Optional tooltip override. */
  title?: string
  /** Optional size — defaults to sm. */
  size?: 'sm' | 'md'
  className?: string
}

export function WandButton({
  kind,
  content,
  context,
  onPolished,
  title,
  size = 'sm',
  className = '',
}: WandButtonProps) {
  const [busy, setBusy] = useState(false)
  const { showToast } = useToast()
  const disabled = busy || !content || !content.trim()
  const px = size === 'md' ? 'p-1.5' : 'p-1'
  const iconSize = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'

  const run = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/ai/polish-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, content, context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error || 'Polish failed')
      onPolished(String(data.polished || '').trim())
    } catch (e: any) {
      showToast('error', e?.message || 'Polish failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled}
      title={title || 'Polish this section with AI'}
      aria-label="Polish with AI"
      className={`inline-flex items-center justify-center rounded-full ${px} text-brand-steel hover:text-brand-ink hover:bg-brand-mist disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 ${className}`}
    >
      {busy ? <Spinner size={size === 'md' ? 'md' : 'sm'} /> : <Wand2 className={iconSize} />}
    </button>
  )
}
