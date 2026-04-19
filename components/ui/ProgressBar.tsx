import React from 'react'

interface ProgressBarProps {
  current: number
  total: number
  showLabel?: boolean
  className?: string
}

export function ProgressBar({ current, total, showLabel = true, className = '' }: ProgressBarProps) {
  const percentage = Math.round((current / total) * 100)

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
           <span className="text-sm font-medium text-brand-slate">
             Step {current} of {total}
           </span>
           <span className="text-sm text-brand-steel">{percentage}%</span>
         </div>
       )}
      <div className="w-full bg-brand-border rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-brand-accent h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
