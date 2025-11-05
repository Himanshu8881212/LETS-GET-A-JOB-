import { getDatabase } from '../db/index'
import { ResumeData, CoverLetterData } from '../validation/schemas'
import { logActivity } from './activity-logger'
import fs from 'fs'
import path from 'path'

const STORAGE_DIR = path.join(process.cwd(), 'data', 'documents')

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true })
}

export interface ResumeVersion {
  id: number
  user_id: number
  version_name: string
  description: string | null
  data_json: string
  pdf_path: string | null
  file_size: number | null
  is_favorite: number
  tags: string | null
  parent_version_id: number | null
  version_number: string
  branch_name: string
  is_active: number
  created_at: string
  updated_at: string
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
  created_at: string
  updated_at: string
}

/**
 * Save a resume version (creates new main version or branches from parent)
 */
export async function saveResumeVersion(
  userId: number,
  versionName: string,
  data: ResumeData,
  options?: {
    description?: string
    tags?: string
    isFavorite?: boolean
    parentVersionId?: number
    branchName?: string
  }
): Promise<ResumeVersion> {
  const db = getDatabase()

  let versionNumber = 'v1.0'
  let branchName = options?.branchName || 'main'
  let parentVersionId = options?.parentVersionId || null

  // If parent version is provided, calculate semantic version
  if (parentVersionId) {
    const parentVersion = db
      .prepare('SELECT version_number FROM resume_versions WHERE id = ? AND user_id = ?')
      .get(parentVersionId, userId) as { version_number: string } | undefined

    if (parentVersion) {
      versionNumber = calculateSemanticVersion(parentVersion.version_number || 'v1.0')
    }
  } else {
    // For new main versions, find the highest version number
    const latestVersion = db
      .prepare(
        `SELECT version_number FROM resume_versions
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
      `SELECT id FROM resume_versions
       WHERE user_id = ? AND branch_name = ? AND version_number = ?`
    )
    .get(userId, branchName, versionNumber) as { id: number } | undefined

  let versionId: number

  if (existingVersion) {
    // Update existing version
    db.prepare(`
      UPDATE resume_versions
      SET version_name = ?, description = ?, data_json = ?, tags = ?, is_favorite = ?,
          parent_version_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      versionName,
      options?.description || null,
      JSON.stringify(data),
      options?.tags || null,
      options?.isFavorite ? 1 : 0,
      parentVersionId,
      existingVersion.id
    )
    versionId = existingVersion.id
  } else {
    // Insert new version
    const result = db.prepare(`
      INSERT INTO resume_versions (
        user_id, version_name, description, data_json, tags, is_favorite,
        parent_version_id, version_number, branch_name, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      userId,
      versionName,
      options?.description || null,
      JSON.stringify(data),
      options?.tags || null,
      options?.isFavorite ? 1 : 0,
      parentVersionId,
      versionNumber,
      branchName
    )
    versionId = result.lastInsertRowid as number
  }

  // Log activity
  await logActivity({
    userId,
    action: 'create',
    entityType: 'resume',
    entityId: versionId,
    details: {
      version_name: versionName,
      version_number: versionNumber,
      branch_name: branchName,
      parent_version_id: parentVersionId
    }
  })

  return getResumeVersion(userId, versionId)!
}

/**
 * Get all resume versions for a user
 */
export function getAllResumeVersions(userId: number): ResumeVersion[] {
  const db = getDatabase()

  return db.prepare(`
    SELECT * FROM resume_versions
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId) as ResumeVersion[]
}

/**
 * Get a single resume version
 */
export function getResumeVersion(userId: number, versionId: number): ResumeVersion | undefined {
  const db = getDatabase()

  return db.prepare(`
    SELECT * FROM resume_versions
    WHERE id = ? AND user_id = ?
  `).get(versionId, userId) as ResumeVersion | undefined
}

/**
 * Update resume version metadata
 */
export async function updateResumeVersion(
  userId: number,
  versionId: number,
  updates: {
    version_name?: string
    description?: string
    tags?: string
    is_favorite?: boolean
  }
): Promise<ResumeVersion | null> {
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
    return getResumeVersion(userId, versionId) || null
  }

  values.push(versionId, userId)

  const result = db.prepare(`
    UPDATE resume_versions
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
    entityType: 'resume',
    entityId: versionId,
    details: updates
  })

  return getResumeVersion(userId, versionId) || null
}

/**
 * Delete a resume version
 */
export async function deleteResumeVersion(userId: number, versionId: number): Promise<boolean> {
  const db = getDatabase()

  const version = getResumeVersion(userId, versionId)
  if (!version) return false

  // Delete PDF file if exists
  if (version.pdf_path && fs.existsSync(version.pdf_path)) {
    fs.unlinkSync(version.pdf_path)
  }

  const result = db.prepare(`
    DELETE FROM resume_versions
    WHERE id = ? AND user_id = ?
  `).run(versionId, userId)

  if (result.changes > 0) {
    // Log activity
    await logActivity({
      userId,
      action: 'delete',
      entityType: 'resume',
      entityId: versionId,
      details: { version_name: version.version_name }
    })

    return true
  }

  return false
}

/**
 * Save PDF file for a resume version
 */
export async function saveResumePDF(
  userId: number,
  versionId: number,
  pdfBuffer: Buffer
): Promise<string> {
  const db = getDatabase()

  const version = getResumeVersion(userId, versionId)
  if (!version) {
    throw new Error('Resume version not found')
  }

  // Generate filename
  const filename = `resume_${versionId}_${Date.now()}.pdf`
  const filepath = path.join(STORAGE_DIR, filename)

  // Save file
  fs.writeFileSync(filepath, pdfBuffer)
  const fileSize = fs.statSync(filepath).size

  // Update database
  db.prepare(`
    UPDATE resume_versions
    SET pdf_path = ?, file_size = ?
    WHERE id = ? AND user_id = ?
  `).run(filepath, fileSize, versionId, userId)

  // Log activity
  await logActivity({
    userId,
    action: 'generate_pdf',
    entityType: 'resume',
    entityId: versionId,
    details: { file_size: fileSize }
  })

  return filepath
}

// Similar functions for cover letters...
export async function saveCoverLetterVersion(
  userId: number,
  versionName: string,
  data: CoverLetterData,
  options?: {
    description?: string
    tags?: string
    isFavorite?: boolean
    jobApplicationId?: number
  }
): Promise<CoverLetterVersion> {
  const db = getDatabase()

  const result = db.prepare(`
    INSERT INTO cover_letter_versions (user_id, version_name, description, data_json, tags, is_favorite, job_application_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    versionName,
    options?.description || null,
    JSON.stringify(data),
    options?.tags || null,
    options?.isFavorite ? 1 : 0,
    options?.jobApplicationId || null
  )

  const versionId = result.lastInsertRowid as number

  await logActivity({
    userId,
    action: 'create',
    entityType: 'cover_letter',
    entityId: versionId,
    details: { version_name: versionName }
  })

  return getCoverLetterVersion(userId, versionId)!
}

export function getAllCoverLetterVersions(userId: number): CoverLetterVersion[] {
  const db = getDatabase()

  return db.prepare(`
    SELECT * FROM cover_letter_versions
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId) as CoverLetterVersion[]
}

export function getCoverLetterVersion(userId: number, versionId: number): CoverLetterVersion | undefined {
  const db = getDatabase()

  return db.prepare(`
    SELECT * FROM cover_letter_versions
    WHERE id = ? AND user_id = ?
  `).get(versionId, userId) as CoverLetterVersion | undefined
}

export async function deleteCoverLetterVersion(userId: number, versionId: number): Promise<boolean> {
  const db = getDatabase()

  const version = getCoverLetterVersion(userId, versionId)
  if (!version) return false

  if (version.pdf_path && fs.existsSync(version.pdf_path)) {
    fs.unlinkSync(version.pdf_path)
  }

  const result = db.prepare(`
    DELETE FROM cover_letter_versions
    WHERE id = ? AND user_id = ?
  `).run(versionId, userId)

  if (result.changes > 0) {
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
 * Calculate semantic version number based on parent version
 * Examples:
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
    // Parent is v2.1 → create v2.1.1
    // Parent is v2.1.1 → create v2.1.2
    return `v${parts[0]}.${parts[1]}.${parts[2] + 1}`
  } else {
    // Fallback for unexpected format
    return `v${parts[0]}.${parts[1] + 1}`
  }
}

/**
 * Create a new resume version from an existing one (branching)
 */
export async function createResumeVersionBranch(
  userId: number,
  parentVersionId: number,
  branchName: string,
  versionName: string,
  description?: string
) {
  const db = getDatabase()

  // Get parent version
  const parentVersion = db
    .prepare('SELECT * FROM resume_versions WHERE id = ? AND user_id = ?')
    .get(parentVersionId, userId) as ResumeVersion | undefined

  if (!parentVersion) {
    throw new Error('Parent version not found')
  }

  // Calculate new semantic version number
  const parentVersionNum = parentVersion.version_number || 'v1.0'
  const newVersionNumber = calculateSemanticVersion(parentVersionNum)

  // Create new version
  const result = db
    .prepare(
      `INSERT INTO resume_versions
       (user_id, version_name, description, data_json, parent_version_id,
        version_number, branch_name, is_active, is_favorite, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?)`
    )
    .run(
      userId,
      versionName,
      description || `Branch from ${parentVersion.version_name}`,
      parentVersion.data_json,
      parentVersionId,
      newVersionNumber,
      branchName,
      parentVersion.tags
    )

  // Log activity
  logActivity({
    userId,
    action: 'create',
    entityType: 'resume',
    entityId: result.lastInsertRowid as number,
    details: {
      version_name: versionName,
      branch_name: branchName,
      parent_version_id: parentVersionId,
      version_number: newVersionNumber
    }
  })

  return result.lastInsertRowid as number
}

/**
 * Update resume version with new data (creates new version in lineage)
 */
export async function updateResumeVersionWithLineage(
  userId: number,
  currentVersionId: number,
  data: ResumeData,
  versionName?: string,
  description?: string
) {
  const db = getDatabase()

  // Get current version
  const currentVersion = db
    .prepare('SELECT * FROM resume_versions WHERE id = ? AND user_id = ?')
    .get(currentVersionId, userId) as ResumeVersion | undefined

  if (!currentVersion) {
    throw new Error('Current version not found')
  }

  // Calculate new version number
  const currentVersionNum = currentVersion.version_number || 'v1.0'
  const [major, minor] = currentVersionNum.replace('v', '').split('.').map(Number)
  const newVersionNumber = `v${major}.${minor + 1}`

  // Create new version
  const result = db
    .prepare(
      `INSERT INTO resume_versions
       (user_id, version_name, description, data_json, parent_version_id,
        version_number, branch_name, is_active, is_favorite, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    )
    .run(
      userId,
      versionName || `${currentVersion.version_name} (Updated)`,
      description || `Updated from ${currentVersion.version_name}`,
      JSON.stringify(data),
      currentVersionId,
      newVersionNumber,
      currentVersion.branch_name,
      currentVersion.is_favorite,
      currentVersion.tags
    )

  // Deactivate old version
  db.prepare('UPDATE resume_versions SET is_active = 0 WHERE id = ?').run(currentVersionId)

  // Log activity
  logActivity({
    userId,
    action: 'update',
    entityType: 'resume',
    entityId: result.lastInsertRowid as number,
    details: {
      version_name: versionName,
      parent_version_id: currentVersionId,
      previous_version: currentVersion.version_name
    }
  })

  return result.lastInsertRowid as number
}

/**
 * Get next version number for a branch
 */
export function getNextVersionNumber(userId: number, branchName: string): string {
  const db = getDatabase()

  const latestVersion = db
    .prepare(
      `SELECT version_number FROM resume_versions
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
