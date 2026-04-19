import React from 'react'

interface SectionTab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface SectionTabsProps {
  tabs: SectionTab[]
  activeId: string
  onChange: (id: string) => void
}

export function SectionTabs({ tabs, activeId, onChange }: SectionTabsProps) {
  return (
    <div className="inline-flex rounded-full border border-brand-border bg-white p-1 shadow-sm">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${tab.id === activeId
              ? 'bg-brand-ink text-white shadow-sm'
              : 'text-brand-slate hover:bg-brand-mist'
            }`}
        >
          {tab.icon && <span className="opacity-70">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  )
}
