import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET all resume versions
export async function GET() {
  try {
    const versions = db.prepare(`
      SELECT id, version_name, created_at, updated_at 
      FROM resume_versions 
      ORDER BY updated_at DESC
    `).all()

    return NextResponse.json(
      versions.map((v: any) => ({
        ...v,
        createdAt: new Date(v.created_at),
        updatedAt: new Date(v.updated_at)
      }))
    )
  } catch (error) {
    console.error('Error fetching resume versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resume versions' },
      { status: 500 }
    )
  }
}

// POST create/update resume version
export async function POST(request: NextRequest) {
  try {
    const { id, versionName, data } = await request.json()

    // Check if version exists
    const existing = db.prepare('SELECT id FROM resume_versions WHERE id = ?').get(id)

    if (existing) {
      // Update existing
      db.prepare(`
        UPDATE resume_versions 
        SET version_name = ?, data = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(versionName, JSON.stringify(data), id)
    } else {
      // Insert new
      db.prepare(`
        INSERT INTO resume_versions (id, version_name, data)
        VALUES (?, ?, ?)
      `).run(id, versionName, JSON.stringify(data))
    }

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Error saving resume version:', error)
    return NextResponse.json(
      { error: 'Failed to save resume version' },
      { status: 500 }
    )
  }
}

// GET specific resume version data
export async function GET_VERSION(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Version ID is required' },
        { status: 400 }
      )
    }

    const version = db.prepare('SELECT * FROM resume_versions WHERE id = ?').get(id) as any

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...version,
      data: JSON.parse(version.data),
      createdAt: new Date(version.created_at),
      updatedAt: new Date(version.updated_at)
    })
  } catch (error) {
    console.error('Error fetching resume version:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resume version' },
      { status: 500 }
    )
  }
}

// DELETE resume version
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Version ID is required' },
        { status: 400 }
      )
    }

    db.prepare('DELETE FROM resume_versions WHERE id = ?').run(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting resume version:', error)
    return NextResponse.json(
      { error: 'Failed to delete resume version' },
      { status: 500 }
    )
  }
}

