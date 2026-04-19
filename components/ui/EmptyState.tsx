import React from 'react'

interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-brand-border bg-white px-6 py-10 text-center">
      {icon && <div className="mb-4 text-brand-steel">{icon}</div>}
      <h3 className="text-lg font-semibold text-brand-ink font-display">{title}</h3>
      <p className="mt-2 text-sm text-brand-steel max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
