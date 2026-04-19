import React from 'react'
import { Spinner } from './Spinner'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-full'

  const variants = {
    primary: 'bg-brand-ink text-white hover:bg-brand-slate disabled:bg-brand-steel border border-brand-ink shadow-sm',
    secondary: 'bg-brand-slate text-white hover:bg-brand-ink disabled:bg-brand-steel border border-brand-slate shadow-sm',
    outline: 'border border-brand-border text-brand-ink bg-white hover:bg-brand-mist hover:border-brand-steel disabled:border-brand-border disabled:text-brand-steel',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 border border-red-600',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-400 border border-emerald-600'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base'
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${disabled || loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${className}
      `}
    >
      {loading && <Spinner size={size === 'sm' ? 'sm' : 'md'} className="mr-1.5" />}
      {!loading && icon && <span className="mr-1.5">{icon}</span>}
      {children}
    </button>
  )
}
