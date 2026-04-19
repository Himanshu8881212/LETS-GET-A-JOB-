'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import { JobApplication, JobStatus } from '@/types/job-tracker'
import JobCard from './JobCard'
import AddJobModal from './AddJobModal'
import JobDetailsModal from './JobDetailsModal'

// Droppable Column Component
function DroppableColumn({
  id,
  children,
  className,
  style
}: {
  id: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <div ref={setNodeRef} className={className} style={style}>
      {children}
    </div>
  )
}

interface JobTrackerBoardProps {
  jobs: JobApplication[]
  onAddJob: (job: JobApplication) => void
  onUpdateJob: (job: JobApplication) => void
  onDeleteJob: (jobId: string) => void
  initialJobData?: {
    company?: string
    position?: string
    jobUrl?: string
    jobDescription?: string
    resumeVersionId?: number | null
    coverLetterVersionId?: number | null
  }
  autoOpenModal?: boolean
  onModalClose?: () => void
}

const COLUMNS: { id: JobStatus; title: string; color: string; headerBg: string; headerText: string; countBg: string; countText: string; count: number }[] = [
  { id: 'applied', title: 'Applied', color: 'bg-white', headerBg: 'bg-blue-50', headerText: 'text-blue-700', countBg: 'bg-blue-100', countText: 'text-blue-700', count: 0 },
  { id: 'interview', title: 'Interview', color: 'bg-white', headerBg: 'bg-amber-50', headerText: 'text-amber-700', countBg: 'bg-amber-100', countText: 'text-amber-700', count: 0 },
  { id: 'offer', title: 'Offer', color: 'bg-white', headerBg: 'bg-green-50', headerText: 'text-green-700', countBg: 'bg-green-100', countText: 'text-green-700', count: 0 },
  { id: 'rejected', title: 'Rejected', color: 'bg-white', headerBg: 'bg-red-50', headerText: 'text-red-700', countBg: 'bg-red-100', countText: 'text-red-700', count: 0 },
]

export default function JobTrackerBoard({
  jobs,
  onAddJob,
  onUpdateJob,
  onDeleteJob,
  initialJobData,
  autoOpenModal = false,
  onModalClose,
}: JobTrackerBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(autoOpenModal)
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null)
  const [modalPrefillData, setModalPrefillData] = useState<any>(null)

  // Update modal state when autoOpenModal prop changes
  // Only auto-open and prefill when explicitly triggered from Apply button
  useEffect(() => {
    if (autoOpenModal && initialJobData) {
      setModalPrefillData(initialJobData)
      setShowAddModal(true)
    }
  }, [autoOpenModal, initialJobData])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const jobId = active.id as string
    const newStatus = over.id as JobStatus

    const job = jobs.find(j => j.id === jobId)
    if (!job || job.status === newStatus) {
      setActiveId(null)
      return
    }

    // Update job status
    const updatedJob: JobApplication = {
      ...job,
      status: newStatus,
      updatedAt: new Date(),
      statusHistory: [
        ...job.statusHistory,
        {
          from: job.status,
          to: newStatus,
          timestamp: new Date(),
        },
      ],
    }

    onUpdateJob(updatedJob)
    setActiveId(null)
  }

  const getJobsByStatus = (status: JobStatus) => {
    return jobs.filter(job => job.status === status)
  }

  const activeJob = activeId ? jobs.find(j => j.id === activeId) : null

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-brand-ink">Applications Board</h2>
          <p className="text-sm text-brand-steel mt-1">Drag and drop to change status</p>
        </div>
        <button
          onClick={() => {
            setModalPrefillData(null) // Clear any prefill data for manual add
            setShowAddModal(true)
          }}
          className="flex items-center gap-2 bg-brand-ink text-white px-4 py-2 hover:bg-brand-slate transition-colors font-medium text-sm rounded-full"
        >
          <Plus className="w-4 h-4" />
          Add Application
        </button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map(column => {
            const columnJobs = getJobsByStatus(column.id)
            return (
              <div
                key={column.id}
                className="bg-white border border-brand-border overflow-hidden flex flex-col rounded-xl shadow-soft"
              >
                {/* Column Header */}
                <div className={`${column.headerBg} ${column.headerText} px-4 py-3 rounded-t-xl border-b border-brand-border`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] uppercase tracking-[0.18em] font-semibold">{column.title}</h3>
                    <span className={`${column.countBg} ${column.countText} px-2 py-0.5 text-[11px] font-semibold rounded-full`}>
                      {columnJobs.length}
                    </span>
                  </div>
                </div>

                {/* Column Content - Droppable with max 5 items visible, then scroll */}
                <DroppableColumn
                  id={column.id}
                  className={`flex-1 p-3 ${column.color} overflow-y-auto`}
                  style={{ maxHeight: 'calc(5 * 180px + 24px)' }}
                >
                  <div className="space-y-2 min-h-[200px]">
                    {columnJobs.map(job => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onClick={() => setSelectedJob(job)}
                      />
                    ))}
                    {columnJobs.length === 0 && (
                      <div className="text-center text-brand-steel py-16">
                        <p className="text-sm font-medium">No applications</p>
                        <p className="text-xs mt-1">Drag cards here</p>
                      </div>
                    )}
                  </div>
                </DroppableColumn>
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeJob ? (
            <div className="rotate-3 opacity-80">
              <JobCard job={activeJob} onClick={() => { }} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      {showAddModal && (
        <AddJobModal
          onClose={() => {
            setShowAddModal(false)
            setModalPrefillData(null) // Clear prefill data when modal closes
            if (onModalClose) {
              onModalClose()
            }
          }}
          onAdd={onAddJob}
          initialData={modalPrefillData}
        />
      )}

      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onUpdate={onUpdateJob}
          onDelete={onDeleteJob}
        />
      )}
    </>
  )
}

