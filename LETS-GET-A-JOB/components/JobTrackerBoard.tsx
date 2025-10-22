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
} from '@dnd-kit/core'
import { JobApplication, JobStatus } from '@/types/job-tracker'
import JobCard from './JobCard'
import AddJobModal from './AddJobModal'
import JobDetailsModal from './JobDetailsModal'

interface JobTrackerBoardProps {
  jobs: JobApplication[]
  onAddJob: (job: JobApplication) => void
  onUpdateJob: (job: JobApplication) => void
  onDeleteJob: (jobId: string) => void
}

const COLUMNS: { id: JobStatus; title: string; color: string }[] = [
  { id: 'applied', title: 'Applied', color: 'bg-gray-100' },
  { id: 'interview', title: 'Interview', color: 'bg-blue-50' },
  { id: 'offer', title: 'Offer', color: 'bg-green-50' },
  { id: 'rejected', title: 'Rejected', color: 'bg-red-50' },
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
          className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {COLUMNS.map(column => {
            const columnJobs = getJobsByStatus(column.id)
            return (
              <div
                key={column.id}
                className="bg-white rounded-xl border-2 border-gray-900 shadow-lg overflow-hidden"
              >
                {/* Column Header */}
                <div className="bg-black text-white p-4">
                  <h3 className="font-bold text-lg">{column.title}</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {columnJobs.length} {columnJobs.length === 1 ? 'application' : 'applications'}
                  </p>
                </div>

                {/* Column Content */}
                <div
                  id={column.id}
                  className={`min-h-[500px] p-4 space-y-3 ${column.color}`}
                >
                  {columnJobs.map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onClick={() => setSelectedJob(job)}
                    />
                  ))}
                  {columnJobs.length === 0 && (
                    <div className="text-center text-gray-400 py-12">
                      <p className="text-sm">No applications yet</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeJob ? (
            <div className="rotate-3 opacity-80">
              <JobCard job={activeJob} onClick={() => {}} />
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

