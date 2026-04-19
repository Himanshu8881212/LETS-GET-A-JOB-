import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface SidebarItem {
  id: string
  label: string
  icon?: React.ReactNode
  active?: boolean
  onClick?: () => void
}

interface SidebarNavProps {
  brand?: string
  subtitle?: string
  logoSrc?: string
  logoIconSrc?: string
  onLogoClick?: () => void
  items: SidebarItem[]
  secondaryItems?: SidebarItem[]
  isCollapsed?: boolean
  onToggle?: () => void
}

export function SidebarNav({
  brand,
  subtitle,
  logoSrc,
  logoIconSrc,
  onLogoClick,
  items,
  secondaryItems = [],
  isCollapsed = false,
  onToggle
}: SidebarNavProps) {
  return (
    <div className={`flex h-full flex-col transition-all duration-300 ${isCollapsed ? 'px-3 py-8' : 'px-6 py-8'}`}>
      {/* Logo section - clickable */}
      <div
        className={`mb-10 transition-all duration-300 cursor-pointer ${isCollapsed ? 'flex justify-center' : ''}`}
        onClick={onLogoClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onLogoClick?.()}
      >
        {isCollapsed ? (
          logoIconSrc ? (
            <img src={logoIconSrc} alt="Logo" className="h-8 w-auto object-contain" />
          ) : (
            brand && (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-ink text-white font-display text-lg font-bold">
                {brand.charAt(0)}
              </span>
            )
          )
        ) : (
          <>
            {logoSrc ? (
              <img src={logoSrc} alt={brand || 'Logo'} className="h-12 w-auto object-contain" />
            ) : (
              brand && (
                <div className="font-display text-3xl font-bold tracking-tight text-brand-ink whitespace-nowrap">
                  {brand}
                </div>
              )
            )}
            {subtitle && <div className="mt-1 text-xs uppercase tracking-[0.2em] text-brand-steel">{subtitle}</div>}
          </>
        )}
      </div>

      <nav className="flex-1 space-y-2">
        {items.map(item => (
          <button
            key={item.id}
            onClick={item.onClick}
            title={isCollapsed ? item.label : undefined}
            className={`group flex w-full items-center rounded-xl p-2.5 text-left text-sm font-medium transition-all ${isCollapsed ? 'justify-center' : 'gap-3 px-3'
              } ${item.active
                ? 'bg-brand-ink text-white shadow-soft'
                : 'text-brand-slate hover:bg-brand-mist'
              }`}
          >
            {item.icon && (
              <span className={`text-base flex-shrink-0 ${item.active ? 'text-white' : 'text-brand-steel group-hover:text-brand-ink'}`}>
                {item.icon}
              </span>
            )}
            {!isCollapsed && <span className="whitespace-nowrap transition-opacity duration-300">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 space-y-6">
        {secondaryItems.length > 0 && (
          <div className={`border-t border-brand-border pt-6 space-y-2 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
            {secondaryItems.map(item => (
              <button
                key={item.id}
                onClick={item.onClick}
                title={isCollapsed ? item.label : undefined}
                className={`flex w-full items-center rounded-xl p-2.5 text-left text-sm font-medium text-brand-slate transition-all hover:bg-brand-mist ${isCollapsed ? 'justify-center' : 'gap-3 px-3'
                  }`}
              >
                {item.icon && <span className="text-base text-brand-steel flex-shrink-0">{item.icon}</span>}
                {!isCollapsed && <span className="whitespace-nowrap transition-opacity duration-300">{item.label}</span>}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onToggle}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-brand-steel transition hover:bg-brand-mist hover:text-brand-ink ${isCollapsed ? 'justify-center' : ''
            }`}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
