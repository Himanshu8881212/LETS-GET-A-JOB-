import React from 'react'
import { AlertCircle } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  showCharCount?: boolean
  maxLength?: number
}

export function Input({
  label,
  error,
  helperText,
  showCharCount,
  maxLength,
  className = '',
  ...props
}: InputProps) {
  const value = props.value?.toString() || ''
  const charCount = value.length

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        {...props}
        maxLength={maxLength}
        className={`
          w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-all duration-200 text-black
          ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}
          ${className}
        `}
      />
      <div className="mt-1 flex items-center justify-between">
        <div className="flex-1">
          {error && (
            <div className="flex items-center text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
          {!error && helperText && (
            <p className="text-sm text-gray-500">{helperText}</p>
          )}
        </div>
        {showCharCount && maxLength && (
          <span className={`text-sm ${charCount > maxLength * 0.9 ? 'text-orange-600' : 'text-gray-500'}`}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  )
}

