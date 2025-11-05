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
          <span className="text-sm font-medium text-gray-700">
            Step {current} of {total}
          </span>
          <span className="text-sm text-gray-500">{percentage}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

