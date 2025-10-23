'use client'

import { useState } from 'react'
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
}

const COLUMNS: { id: JobStatus; title: string; color: string; headerColor: string; count: number }[] = [
  { id: 'applied', title: 'Applied', color: 'bg-gray-50', headerColor: 'bg-gray-800', count: 0 },
  { id: 'interview', title: 'Interview', color: 'bg-blue-50', headerColor: 'bg-blue-600', count: 0 },
  { id: 'offer', title: 'Offer', color: 'bg-green-50', headerColor: 'bg-green-600', count: 0 },
  { id: 'rejected', title: 'Rejected', color: 'bg-red-50', headerColor: 'bg-red-600', count: 0 },
]

export default function JobTrackerBoard({
  jobs,
  onAddJob,
  onUpdateJob,
  onDeleteJob,
}: JobTrackerBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null)

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
          <h2 className="text-2xl font-bold text-gray-900">Applications Board</h2>
          <p className="text-gray-600 mt-1">Drag and drop to change status</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 hover:bg-gray-800 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
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
                className="bg-white border border-gray-300 overflow-hidden flex flex-col"
              >
                {/* Column Header */}
                <div className={`${column.headerColor} text-white p-3`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base">{column.title}</h3>
                    <span className="bg-white/20 px-2 py-0.5 text-xs font-semibold">
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
                      <div className="text-center text-gray-400 py-16">
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
          onClose={() => setShowAddModal(false)}
          onAdd={onAddJob}
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

