import React from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-6 border-b border-brand-border bg-white px-8 py-6">
      <div>
        {eyebrow && (
          <div className="text-xs uppercase tracking-[0.2em] text-brand-steel">
            {eyebrow}
          </div>
        )}
        <h1 className="mt-2 text-3xl font-semibold text-brand-ink font-display">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-sm text-brand-steel">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
