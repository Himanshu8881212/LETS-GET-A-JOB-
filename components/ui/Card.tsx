import React from 'react'

interface CardProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Card({ title, description, actions, children, className = '' }: CardProps) {
  return (
    <div className={`rounded-xl border border-brand-border bg-white p-6 shadow-soft ${className}`}>
      {(title || description || actions) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-brand-ink font-display">
                {title}
              </h3>
            )}
            {description && <p className="mt-1 text-sm text-brand-steel">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
