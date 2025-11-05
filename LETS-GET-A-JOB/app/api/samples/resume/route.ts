import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase()

    // Get the first resume from the database (any user)
    const firstResume = db.prepare(`
      SELECT id, version_name, version_number, data_json
      FROM resume_versions
      ORDER BY created_at DESC
      LIMIT 1
    `).get() as any

    if (!firstResume) {
      return NextResponse.json(
        { error: 'No resume samples available' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: firstResume.id,
      version_name: firstResume.version_name,
      version_number: firstResume.version_number,
      data: JSON.parse(firstResume.data_json)
    })
  } catch (error) {
    console.error('Error fetching sample resume:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sample resume' },
      { status: 500 }
    )
  }
}

