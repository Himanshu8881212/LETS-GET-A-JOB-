/**
 * Unified loading primitives. Every loading indicator in the app should
 * use one of these — the goal is zero "bespoke spinners" anywhere else.
 *
 *   <Spinner />          → 16px dark ring, inline
 *   <Spinner size="sm" /> → 12px
 *   <Spinner size="lg" /> → 28px
 *   <PageLoader label /> → full-height centered column
 *   <Skeleton />          → shimmer block for content placeholders
 *   <DotPulse />          → three dots (use in chat "typing…" spots)
 */

import React from 'react'

type Size = 'xs' | 'sm' | 'md' | 'lg'

const SIZE_PX: Record<Size, number> = {
  xs: 10,
  sm: 12,
  md: 16,
  lg: 28,
}

const SIZE_BORDER: Record<Size, string> = {
  xs: 'border',
  sm: 'border',
  md: 'border-2',
  lg: 'border-[3px]',
}

export function Spinner({
  size = 'md',
  className = '',
}: {
  size?: Size
  className?: string
}) {
  const px = SIZE_PX[size]
  const border = SIZE_BORDER[size]
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full ${border} border-brand-steel/30 border-t-brand-ink animate-spin-fast ${className}`}
      style={{ width: px, height: px }}
    />
  )
}

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex-1 bg-brand-mist/20 flex flex-col h-full items-center justify-center">
      <Spinner size="lg" />
      {label && <p className="mt-3 text-sm text-brand-steel">{label}</p>}
    </div>
  )
}

export function InlineLoader({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-brand-steel">
      <Spinner size="sm" />
      {label && <span>{label}</span>}
    </span>
  )
}

export function Skeleton({
  width = '100%',
  height = 14,
  className = '',
  rounded = true,
}: {
  width?: number | string
  height?: number | string
  className?: string
  rounded?: boolean
}) {
  return (
    <span
      aria-hidden="true"
      className={`block bg-brand-mist animate-shimmer ${rounded ? 'rounded-md' : ''} ${className}`}
      style={{ width, height }}
    />
  )
}

export function DotPulse({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Thinking"
      className={`inline-flex items-center gap-0.5 ${className}`}
    >
      <span className="w-1 h-1 rounded-full bg-brand-steel animate-bounce [animation-delay:-0.32s]" />
      <span className="w-1 h-1 rounded-full bg-brand-steel animate-bounce [animation-delay:-0.16s]" />
      <span className="w-1 h-1 rounded-full bg-brand-steel animate-bounce" />
    </span>
  )
}
