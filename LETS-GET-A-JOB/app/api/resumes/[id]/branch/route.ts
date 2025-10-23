import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/db/session'
import { createResumeVersionBranch } from '@/lib/services/document-service'
import { z } from 'zod'

export const maxDuration = 10 // 10 seconds max

const branchSchema = z.object({
  branchName: z.string().min(1).max(100),
  versionName: z.string().min(1).max(200),
  description: z.string().max(500).optional()
})

/**
 * POST /api/resumes/[id]/branch - Create a new branch from an existing version
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserSession()
    const { id } = await params
    const parentVersionId = parseInt(id)

    if (isNaN(parentVersionId)) {
      return NextResponse.json({ error: 'Invalid version ID' }, { status: 400 })
    }

    const body = await request.json()
    const { branchName, versionName, description } = branchSchema.parse(body)

    const newVersionId = await createResumeVersionBranch(
      userId,
      parentVersionId,
      branchName,
      versionName,
      description
    )

    return NextResponse.json({
      success: true,
      versionId: newVersionId,
      message: `Branch "${branchName}" created successfully`
    })
  } catch (error) {
    console.error('Error creating branch:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create branch' },
      { status: 500 }
    )
  }
}

