'use client'

import { useDraggable } from '@dnd-kit/core'
import { Briefcase, Calendar, MapPin, DollarSign, FileText } from 'lucide-react'
import { JobApplication } from '@/types/job-tracker'

interface JobCardProps {
  job: JobApplication
  onClick: () => void
}

export default function JobCard({ job, onClick }: JobCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getDaysAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`bg-white border-2 border-gray-900 rounded-lg p-4 cursor-pointer hover:shadow-xl transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Company & Position */}
      <div className="mb-3">
        <h4 className="font-bold text-gray-900 text-lg mb-1">{job.company}</h4>
        <p className="text-gray-700 font-medium">{job.position}</p>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        {/* Application Date */}
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(job.applicationDate)}</span>
          <span className="text-gray-400">({getDaysAgo(job.applicationDate)})</span>
        </div>

        {/* Location */}
        {job.location && (
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{job.location}</span>
          </div>
        )}

        {/* Salary */}
        {job.salary && (
          <div className="flex items-center gap-2 text-gray-600">
            <DollarSign className="w-4 h-4" />
            <span>{job.salary}</span>
          </div>
        )}

        {/* Resume Version */}
        {job.resumeVersion && (
          <div className="flex items-center gap-2 text-gray-600">
            <FileText className="w-4 h-4" />
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              {job.resumeVersion}
            </span>
          </div>
        )}
      </div>

      {/* Notes Preview */}
      {job.notes && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 line-clamp-2">{job.notes}</p>
        </div>
      )}
    </div>
  )
}

