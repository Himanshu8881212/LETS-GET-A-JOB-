import { getDatabase } from '../db/index'
import { CoverLetterData } from '../validation/schemas'
import { logActivity } from './activity-logger'
import fs from 'fs'
import path from 'path'

const STORAGE_DIR = path.join(process.cwd(), 'data', 'documents')

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true })
}

export interface CoverLetterVersion {
  id: number
  user_id: number
  version_name: string
  description: string | null
  data_json: string
  pdf_path: string | null
  file_size: number | null
  is_favorite: number
  tags: string | null
  job_application_id: number | null
  parent_version_id: number | null
  version_number: string
  branch_name: string
  is_active: number
  created_at: string
  updated_at: string
}

/**
 * Calculate semantic version number based on parent version
 * - v1.0 → v1.1 (branch from major version)
 * - v2.0 → v2.1 (branch from major version)
 * - v2.1 → v2.1.1 (branch from minor version)
 * - v2.1.1 → v2.1.2 (branch from patch version)
 */
function calculateSemanticVersion(parentVersionNumber: string): string {
  const versionStr = parentVersionNumber.replace('v', '')
  const parts = versionStr.split('.').map(Number)

  if (parts.length === 2) {
    // Parent is v1.0 or v2.0 → create v1.1 or v2.1
    return `v${parts[0]}.${parts[1] + 1}`
  } else if (parts.length === 3) {
    // Parent is v2.1 or v2.1.1 → create v2.1.1 or v2.1.2
    return `v${parts[0]}.${parts[1]}.${parts[2] + 1}`
  }

  // Default fallback
  return 'v1.1'
}

/**
 * Save a cover letter version (creates new main version or branches from parent)
 */
export async function saveCoverLetterVersion(
  userId: number,
  versionName: string,
  data: CoverLetterData,
  options?: {
    description?: string
    tags?: string
    isFavorite?: boolean
    parentVersionId?: number
    branchName?: string
    jobApplicationId?: number
  }
): Promise<CoverLetterVersion> {
  const db = getDatabase()

  let versionNumber = 'v1.0'
  let branchName = options?.branchName || 'main'
  let parentVersionId = options?.parentVersionId || null

  // If parent version is provided, calculate semantic version
  if (parentVersionId) {
    const parentVersion = db
      .prepare('SELECT version_number FROM cover_letter_versions WHERE id = ? AND user_id = ?')
      .get(parentVersionId, userId) as { version_number: string } | undefined

    if (parentVersion) {
      versionNumber = calculateSemanticVersion(parentVersion.version_number || 'v1.0')
    }
  } else {
    // For new main versions, find the highest version number
    const latestVersion = db
      .prepare(
        `SELECT version_number FROM cover_letter_versions
         WHERE user_id = ? AND parent_version_id IS NULL
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(userId) as { version_number: string } | undefined

    if (latestVersion) {
      const versionStr = latestVersion.version_number.replace('v', '')
      const parts = versionStr.split('.').map(Number)
      versionNumber = `v${parts[0] + 1}.0`
    }
  }

  // Check if a version with the same branch_name and version_number already exists
  const existingVersion = db
    .prepare(
      `SELECT id FROM cover_letter_versions
       WHERE user_id = ? AND branch_name = ? AND version_number = ?`
    )
    .get(userId, branchName, versionNumber) as { id: number } | undefined

  let versionId: number

  if (existingVersion) {
    // Update existing version
    db.prepare(`
      UPDATE cover_letter_versions
      SET version_name = ?, description = ?, data_json = ?, tags = ?, is_favorite = ?,
          parent_version_id = ?, job_application_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      versionName,
      options?.description || null,
      JSON.stringify(data),
      options?.tags || null,
      options?.isFavorite ? 1 : 0,
      parentVersionId,
      options?.jobApplicationId || null,
      existingVersion.id
    )
    versionId = existingVersion.id
  } else {
    // Insert new version
    const result = db.prepare(`
      INSERT INTO cover_letter_versions (
        user_id, version_name, description, data_json, tags, is_favorite,
        parent_version_id, version_number, branch_name, is_active, job_application_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      userId,
      versionName,
      options?.description || null,
      JSON.stringify(data),
      options?.tags || null,
      options?.isFavorite ? 1 : 0,
      parentVersionId,
      versionNumber,
      branchName,
      options?.jobApplicationId || null
    )
    versionId = result.lastInsertRowid as number
  }

  // Log activity
  await logActivity({
    userId,
    action: 'create',
    entityType: 'cover_letter',
    entityId: versionId,
    details: {
      version_name: versionName,
      version_number: versionNumber,
      branch_name: branchName,
      parent_version_id: parentVersionId
    }
  })

  return getCoverLetterVersion(userId, versionId)!
}

/**
 * Get all cover letter versions for a user
 */
export function getAllCoverLetterVersions(userId: number): CoverLetterVersion[] {
  const db = getDatabase()

  return db.prepare(`
    SELECT * FROM cover_letter_versions
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId) as CoverLetterVersion[]
}

/**
 * Get a single cover letter version
 */
export function getCoverLetterVersion(userId: number, versionId: number): CoverLetterVersion | undefined {
  const db = getDatabase()

  return db.prepare(`
    SELECT * FROM cover_letter_versions
    WHERE id = ? AND user_id = ?
  `).get(versionId, userId) as CoverLetterVersion | undefined
}

/**
 * Update cover letter version metadata
 */
export async function updateCoverLetterVersion(
  userId: number,
  versionId: number,
  updates: {
    version_name?: string
    description?: string
    tags?: string
    is_favorite?: boolean
  }
): Promise<CoverLetterVersion | null> {
  const db = getDatabase()

  const fields: string[] = []
  const values: any[] = []

  if (updates.version_name !== undefined) {
    fields.push('version_name = ?')
    values.push(updates.version_name)
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    values.push(updates.description || null)
  }
  if (updates.tags !== undefined) {
    fields.push('tags = ?')
    values.push(updates.tags || null)
  }
  if (updates.is_favorite !== undefined) {
    fields.push('is_favorite = ?')
    values.push(updates.is_favorite ? 1 : 0)
  }

  if (fields.length === 0) {
    return getCoverLetterVersion(userId, versionId) || null
  }

  values.push(versionId, userId)

  const result = db.prepare(`
    UPDATE cover_letter_versions
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
    entityType: 'cover_letter',
    entityId: versionId,
    details: updates
  })

  return getCoverLetterVersion(userId, versionId) || null
}

/**
 * Delete a cover letter version
 */
export async function deleteCoverLetterVersion(userId: number, versionId: number): Promise<boolean> {
  const db = getDatabase()

  const version = getCoverLetterVersion(userId, versionId)
  if (!version) return false

  // Delete PDF file if exists
  if (version.pdf_path && fs.existsSync(version.pdf_path)) {
    fs.unlinkSync(version.pdf_path)
  }

  const result = db.prepare(`
    DELETE FROM cover_letter_versions
    WHERE id = ? AND user_id = ?
  `).run(versionId, userId)

  if (result.changes > 0) {
    // Log activity
    await logActivity({
      userId,
      action: 'delete',
      entityType: 'cover_letter',
      entityId: versionId,
      details: { version_name: version.version_name }
    })

    return true
  }

  return false
}

/**
 * Get next version number for a branch
 */
export function getNextVersionNumber(userId: number, branchName: string): string {
  const db = getDatabase()

  const latestVersion = db
    .prepare(
      `SELECT version_number FROM cover_letter_versions
       WHERE user_id = ? AND branch_name = ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(userId, branchName) as { version_number: string } | undefined

  if (!latestVersion) {
    return 'v1.0'
  }

  const [major, minor] = latestVersion.version_number.replace('v', '').split('.').map(Number)
  return `v${major}.${minor + 1}`
}

