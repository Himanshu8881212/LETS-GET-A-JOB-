// Job Tracker Types

export type JobStatus = 'applied' | 'interview' | 'offer' | 'rejected'

export interface StatusChange {
  from: JobStatus | 'new'
  to: JobStatus
  timestamp: Date
  notes?: string
}

export interface JobApplication {
  id: string
  company: string
  position: string
  status: JobStatus
  applicationDate: Date

  // Resume tracking
  resumeVersion?: string
  resumeVersionId?: number
  coverLetterVersionId?: number
  resumeData?: any // Snapshot of resume data used for this application
  resumePdfUrl?: string

  // Job details
  salary?: string
  location?: string
  jobUrl?: string
  jobDescription?: string

  // Contact information
  contactPerson?: string
  contactEmail?: string

  // Notes and tracking
  notes: string
  statusHistory: StatusChange[]

  // Metadata
  createdAt: Date
  updatedAt: Date
}

export interface JobTrackerStats {
  total: number
  applied: number
  interview: number
  offer: number
  rejected: number
  successRate: number // (offers / total) * 100
  interviewRate: number // (interviews / total) * 100
}

