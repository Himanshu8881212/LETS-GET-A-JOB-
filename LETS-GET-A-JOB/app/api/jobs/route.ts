import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET all job applications
export async function GET() {
  try {
    const jobs = db.prepare(`
      SELECT * FROM job_applications 
      ORDER BY application_date DESC
    `).all()

    // Get status history for each job
    const jobsWithHistory = jobs.map((job: any) => {
      const history = db.prepare(`
        SELECT * FROM status_history 
        WHERE job_id = ? 
        ORDER BY timestamp ASC
      `).all(job.id)

      return {
        ...job,
        applicationDate: new Date(job.application_date),
        createdAt: new Date(job.created_at),
        updatedAt: new Date(job.updated_at),
        statusHistory: history.map((h: any) => ({
          from: h.from_status,
          to: h.to_status,
          timestamp: new Date(h.timestamp),
          notes: h.notes
        }))
      }
    })

    return NextResponse.json(jobsWithHistory)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

// POST create new job application
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const {
      id,
      company,
      position,
      status,
      applicationDate,
      salary,
      location,
      notes,
      resumeVersion
    } = data

    // Insert job
    db.prepare(`
      INSERT INTO job_applications (
        id, company, position, status, application_date,
        salary, location, notes, resume_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      company,
      position,
      status,
      new Date(applicationDate).toISOString(),
      salary || null,
      location || null,
      notes || null,
      resumeVersion || null
    )

    // Add initial status history
    db.prepare(`
      INSERT INTO status_history (job_id, from_status, to_status, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(id, 'new', status, new Date(applicationDate).toISOString())

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Error creating job:', error)
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}

// PUT update job application
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const {
      id,
      company,
      position,
      status,
      applicationDate,
      salary,
      location,
      notes,
      resumeVersion,
      oldStatus
    } = data

    // Update job
    db.prepare(`
      UPDATE job_applications 
      SET company = ?, position = ?, status = ?, application_date = ?,
          salary = ?, location = ?, notes = ?, resume_version = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      company,
      position,
      status,
      new Date(applicationDate).toISOString(),
      salary || null,
      location || null,
      notes || null,
      resumeVersion || null,
      id
    )

    // Add status history if status changed
    if (oldStatus && oldStatus !== status) {
      db.prepare(`
        INSERT INTO status_history (job_id, from_status, to_status)
        VALUES (?, ?, ?)
      `).run(id, oldStatus, status)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
  }
}

// DELETE job application
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    db.prepare('DELETE FROM job_applications WHERE id = ?').run(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    )
  }
}

