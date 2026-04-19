import React from 'react'
import { AlertCircle } from 'lucide-react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  showCharCount?: boolean
  maxLength?: number
}

export function Textarea({
  label,
  error,
  helperText,
  showCharCount,
  maxLength,
  className = '',
  ...props
}: TextareaProps) {
  const value = props.value?.toString() || ''
  const charCount = value.length

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-brand-steel mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        {...props}
        maxLength={maxLength}
        className={`
          w-full rounded-lg border px-4 py-2 text-sm text-brand-ink shadow-sm transition-all duration-200 resize-none
          focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-white
          ${error ? 'border-red-500 bg-red-50' : 'border-brand-border bg-white'}
          ${className}
        `}
      />
      <div className="mt-1 flex items-center justify-between">
        <div className="flex-1">
          {error && (
            <div className="flex items-center text-red-600 text-xs font-medium">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
          {!error && helperText && (
            <p className="text-xs text-brand-steel">{helperText}</p>
          )}
        </div>
        {showCharCount && maxLength && (
          <span className={`text-xs ${charCount > maxLength * 0.9 ? 'text-orange-600' : 'text-brand-steel'}`}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  )
}
