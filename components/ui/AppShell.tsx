import React from 'react'

interface AppShellProps {
  sidebar: React.ReactNode
  header?: React.ReactNode
  children: React.ReactNode
  className?: string
  noPadding?: boolean
  isCollapsed?: boolean
  hideSidebar?: boolean
}

export function AppShell({
  sidebar,
  header,
  children,
  className = '',
  noPadding = false,
  isCollapsed = false,
  hideSidebar = false
}: AppShellProps) {
  return (
    <div className={`min-h-screen text-brand-ink ${className}`}>
      <div
        className="grid min-h-screen transition-all duration-300"
        style={{ gridTemplateColumns: hideSidebar ? '1fr' : (isCollapsed ? '80px 1fr' : '260px 1fr') }}
      >
        {!hideSidebar && (
          <aside className="border-r border-brand-border bg-white shadow-sm overflow-hidden sticky top-0 h-screen">
            {sidebar}
          </aside>
        )}
        <section className="flex min-h-screen flex-col overflow-hidden">
          {header}
          <div className={`flex-1 overflow-y-auto ${noPadding ? '' : 'px-8 pb-12 pt-6'}`}>
            {children}
          </div>
        </section>
      </div>
    </div>
  )
}
