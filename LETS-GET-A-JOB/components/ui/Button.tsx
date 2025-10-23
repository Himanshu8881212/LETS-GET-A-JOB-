import React from 'react'
import { Loader2 } from 'lucide-react'

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
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none'

  const variants = {
    primary: 'bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-400 border border-gray-900',
    secondary: 'bg-gray-700 text-white hover:bg-gray-600 disabled:bg-gray-400 border border-gray-700',
    outline: 'border border-gray-300 text-gray-900 bg-white hover:bg-gray-50 hover:border-gray-400 disabled:border-gray-200 disabled:text-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 border border-red-600',
    success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400 border border-green-600'
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
      {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
      {!loading && icon && <span className="mr-1.5">{icon}</span>}
      {children}
    </button>
  )
}

