import { getDatabase } from '../db/index'
import { JobApplication, UpdateJobApplication } from '../validation/schemas'
import { logActivity } from './activity-logger'

export interface JobApplicationRecord extends JobApplication {
  id: number
  user_id: number
  created_at: string
  updated_at: string
}

/**
 * Create a new job application
 */
export async function createJobApplication(userId: number, data: JobApplication): Promise<JobApplicationRecord> {
  const db = getDatabase()

  const result = db.prepare(`
    INSERT INTO job_applications (
      user_id, company, position, location, job_url, status, salary_range,
      job_description, notes, applied_date, follow_up_date, interview_date,
      offer_date, rejection_date, priority, source, contact_name, contact_email, contact_phone
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    data.company,
    data.position,
    data.location || null,
    data.job_url || null,
    data.status || 'applied',
    data.salary_range || null,
    data.job_description || null,
    data.notes || null,
    data.applied_date || null,
    data.follow_up_date || null,
    data.interview_date || null,
    data.offer_date || null,
    data.rejection_date || null,
    data.priority || 'medium',
    data.source || null,
    data.contact_name || null,
    data.contact_email || null,
    data.contact_phone || null
  )

  const jobId = result.lastInsertRowid as number

  // Log activity
  await logActivity({
    userId,
    action: 'create',
    entityType: 'job_application',
    entityId: jobId,
    details: { company: data.company, position: data.position }
  })

  return getJobApplication(userId, jobId)!
}

/**
 * Get all job applications for a user
 */
export function getAllJobApplications(userId: number): JobApplicationRecord[] {
  const db = getDatabase()

  return db.prepare(`
    SELECT * FROM job_applications
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId) as JobApplicationRecord[]
}

/**
 * Get job applications by status
 */
export function getJobApplicationsByStatus(userId: number, status: string): JobApplicationRecord[] {
  const db = getDatabase()

  return db.prepare(`
    SELECT * FROM job_applications
    WHERE user_id = ? AND status = ?
    ORDER BY created_at DESC
  `).all(userId, status) as JobApplicationRecord[]
}

/**
 * Get a single job application
 */
export function getJobApplication(userId: number, jobId: number): JobApplicationRecord | undefined {
  const db = getDatabase()

  return db.prepare(`
    SELECT * FROM job_applications
    WHERE id = ? AND user_id = ?
  `).get(jobId, userId) as JobApplicationRecord | undefined
}

/**
 * Update a job application
 */
export async function updateJobApplication(
  userId: number,
  jobId: number,
  data: UpdateJobApplication
): Promise<JobApplicationRecord | null> {
  const db = getDatabase()

  // Build dynamic UPDATE query
  const fields: string[] = []
  const values: any[] = []

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`)
      values.push(value === '' ? null : value)
    }
  })

  if (fields.length === 0) {
    return getJobApplication(userId, jobId) || null
  }

  values.push(jobId, userId)

  const result = db.prepare(`
    UPDATE job_applications
    SET ${fields.join(', ')}
    WHERE id = ? AND user_id = ?
  `).run(...values)

  if (result.changes === 0) {
    return null
  }

  // Log activity
  await logActivity({
    userId,
    action: 'update',
    entityType: 'job_application',
    entityId: jobId,
    details: data
  })

  return getJobApplication(userId, jobId) || null
}

/**
 * Delete a job application
 */
export async function deleteJobApplication(userId: number, jobId: number): Promise<boolean> {
  const db = getDatabase()

  const job = getJobApplication(userId, jobId)
  if (!job) return false

  const result = db.prepare(`
    DELETE FROM job_applications
    WHERE id = ? AND user_id = ?
  `).run(jobId, userId)

  if (result.changes > 0) {
    // Log activity
    await logActivity({
      userId,
      action: 'delete',
      entityType: 'job_application',
      entityId: jobId,
      details: { company: job.company, position: job.position }
    })

    return true
  }

  return false
}

/**
 * Get job application statistics
 */
export function getJobStatistics(userId: number): {
  total: number
  byStatus: Record<string, number>
  byPriority: Record<string, number>
} {
  const db = getDatabase()

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM job_applications WHERE user_id = ?
  `).get(userId) as { count: number }

  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM job_applications
    WHERE user_id = ?
    GROUP BY status
  `).all(userId) as { status: string; count: number }[]

  const byPriority = db.prepare(`
    SELECT priority, COUNT(*) as count
    FROM job_applications
    WHERE user_id = ?
    GROUP BY priority
  `).all(userId) as { priority: string; count: number }[]

  return {
    total: total.count,
    byStatus: Object.fromEntries(byStatus.map(s => [s.status, s.count])),
    byPriority: Object.fromEntries(byPriority.map(p => [p.priority, p.count]))
  }
}

/**
 * Get status history for a job application
 */
export function getJobStatusHistory(userId: number, jobId: number): any[] {
  const db = getDatabase()

  // Verify ownership
  const job = getJobApplication(userId, jobId)
  if (!job) return []

  return db.prepare(`
    SELECT * FROM job_status_history
    WHERE job_application_id = ?
    ORDER BY created_at DESC
  `).all(jobId)
}

