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
      className={`bg-white border border-brand-border p-4 cursor-pointer hover:border-brand-steel transition-all rounded-xl shadow-soft hover:shadow-soft ${isDragging ? 'opacity-50' : ''
        }`}
    >
      {/* Company & Position */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-brand-ink truncate">{job.company}</h4>
          <p className="text-xs text-brand-steel mt-0.5 truncate">{job.position}</p>
        </div>
        <span className="inline-flex items-center gap-1 bg-brand-mist text-brand-steel px-2 py-0.5 text-[11px] font-medium rounded-full flex-shrink-0">
          <Calendar className="w-3 h-3" />
          {getDaysAgo(job.applicationDate)}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-xs text-brand-slate">
        {/* Application Date */}
        <div className="flex items-center gap-2 text-brand-steel">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(job.applicationDate)}</span>
        </div>

        {/* Location */}
        {job.location && (
          <div className="flex items-center gap-2 text-brand-steel">
            <MapPin className="w-3.5 h-3.5" />
            <span>{job.location}</span>
          </div>
        )}

        {/* Salary */}
        {job.salary && (
          <div className="flex items-center gap-2 text-brand-steel">
            <DollarSign className="w-3.5 h-3.5" />
            <span>{job.salary}</span>
          </div>
        )}

        {/* Resume Version */}
        {job.resumeVersion && (
          <div className="flex items-center gap-2 text-brand-steel">
            <FileText className="w-3.5 h-3.5" />
            <span className="text-[11px] bg-brand-mist px-2 py-0.5 rounded-full">
              {job.resumeVersion}
            </span>
          </div>
        )}
      </div>

      {/* Notes Preview */}
      {job.notes && (
        <div className="mt-3 pt-3 border-t border-brand-border">
          <p className="text-xs text-brand-steel line-clamp-2">{job.notes}</p>
        </div>
      )}
    </div>
  )
}

