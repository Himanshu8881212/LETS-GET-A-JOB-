import React from 'react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  meta?: string
}

export function StatCard({ label, value, icon, meta }: StatCardProps) {
  return (
    <div className="rounded-xl border border-brand-border bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-steel">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-brand-ink font-display">{value}</p>
          {meta && <p className="mt-1 text-sm text-brand-steel">{meta}</p>}
        </div>
        {icon && <div className="text-brand-accent">{icon}</div>}
      </div>
    </div>
  )
}
