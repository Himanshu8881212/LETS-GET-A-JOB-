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
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm hover:shadow-md active:shadow-sm transform hover:-translate-y-0.5 active:translate-y-0'

  const variants = {
    primary: 'bg-white text-black hover:bg-gray-100 focus:ring-gray-500 disabled:bg-gray-300 shadow-lg hover:shadow-xl border-2 border-black',
    secondary: 'bg-gray-800 text-white hover:bg-gray-700 focus:ring-gray-500 disabled:bg-gray-400 shadow-lg hover:shadow-xl border-2 border-gray-700',
    outline: 'border-2 border-black text-black bg-white hover:bg-gray-50 hover:border-gray-900 focus:ring-gray-500 disabled:border-gray-300 disabled:text-gray-300 shadow-md hover:shadow-lg',
    danger: 'bg-gray-900 text-white hover:bg-black focus:ring-gray-500 disabled:bg-gray-400 shadow-lg hover:shadow-xl border-2 border-gray-800',
    success: 'bg-gray-700 text-white hover:bg-gray-600 focus:ring-gray-500 disabled:bg-gray-400 shadow-lg hover:shadow-xl border-2 border-gray-600'
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-7 py-3.5 text-lg'
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${disabled || loading ? 'cursor-not-allowed opacity-60 transform-none hover:transform-none hover:shadow-sm' : 'cursor-pointer'}
        ${className}
      `}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {!loading && icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  )
}

