/**
 * Resume Statistics Service
 * Calculates success metrics for resume versions based on linked job applications
 */

import { getDatabase } from '@/lib/db'

export interface ResumeVersionStats {
  versionId: number
  versionName: string
  versionNumber: string
  branchName: string
  totalApplications: number
  appliedCount: number
  interviewCount: number
  offerCount: number
  rejectedCount: number
  appliedPercentage: number
  interviewPercentage: number
  offerPercentage: number
  rejectedPercentage: number
  successRate: number // (interview + offer) / total
  conversionRate: number // offer / total
  createdAt: string
  parentVersionId: number | null
  isActive: boolean
  isFavorite: boolean
}

export interface ResumeVersionWithStats {
  id: number
  userId: number
  versionName: string
  description: string | null
  dataJson: string
  pdfPath: string | null
  fileSize: number | null
  isFavorite: boolean
  tags: string | null
  parentVersionId: number | null
  versionNumber: string
  branchName: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  stats: ResumeVersionStats
}

/**
 * Get statistics for a specific resume version
 */
export function getResumeVersionStats(versionId: number): ResumeVersionStats {
  const db = getDatabase()

  // Get version info
  const version = db
    .prepare(
      `SELECT id, version_name, version_number, branch_name, parent_version_id, 
              is_active, is_favorite, created_at
       FROM resume_versions 
       WHERE id = ?`
    )
    .get(versionId) as any

  if (!version) {
    throw new Error(`Resume version ${versionId} not found`)
  }

  // Get job application statistics for this resume version
  const stats = db
    .prepare(
      `SELECT
        COUNT(*) as total_applications,
        SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied_count,
        SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interview_count,
        SUM(CASE WHEN status = 'offer' THEN 1 ELSE 0 END) as offer_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
       FROM job_applications
       WHERE resume_version_id = ?`
    )
    .get(versionId) as any

  const total = stats.total_applications || 0
  const applied = stats.applied_count || 0
  const interview = stats.interview_count || 0
  const offer = stats.offer_count || 0
  const rejected = stats.rejected_count || 0

  return {
    versionId: version.id,
    versionName: version.version_name,
    versionNumber: version.version_number,
    branchName: version.branch_name,
    totalApplications: total,
    appliedCount: applied,
    interviewCount: interview,
    offerCount: offer,
    rejectedCount: rejected,
    appliedPercentage: total > 0 ? Math.round((applied / total) * 100) : 0,
    interviewPercentage: total > 0 ? Math.round((interview / total) * 100) : 0,
    offerPercentage: total > 0 ? Math.round((offer / total) * 100) : 0,
    rejectedPercentage: total > 0 ? Math.round((rejected / total) * 100) : 0,
    successRate: total > 0 ? Math.round(((interview + offer) / total) * 100) : 0,
    conversionRate: total > 0 ? Math.round((offer / total) * 100) : 0,
    createdAt: version.created_at,
    parentVersionId: version.parent_version_id,
    isActive: Boolean(version.is_active),
    isFavorite: Boolean(version.is_favorite)
  }
}

/**
 * Get all resume versions with statistics for a user
 */
export function getAllResumeVersionsWithStats(userId: number): ResumeVersionWithStats[] {
  const db = getDatabase()

  const versions = db
    .prepare(
      `SELECT * FROM resume_versions 
       WHERE user_id = ? 
       ORDER BY created_at DESC`
    )
    .all(userId) as any[]

  return versions.map((version) => ({
    id: version.id,
    userId: version.user_id,
    versionName: version.version_name,
    description: version.description,
    dataJson: version.data_json,
    pdfPath: version.pdf_path,
    fileSize: version.file_size,
    isFavorite: Boolean(version.is_favorite),
    tags: version.tags,
    parentVersionId: version.parent_version_id,
    versionNumber: version.version_number || 'v1.0',
    branchName: version.branch_name || 'main',
    isActive: Boolean(version.is_active),
    createdAt: version.created_at,
    updatedAt: version.updated_at,
    stats: getResumeVersionStats(version.id)
  }))
}

/**
 * Get version lineage (parent-child relationships)
 */
export function getVersionLineage(userId: number) {
  const db = getDatabase()

  const versions = db
    .prepare(
      `SELECT id, version_name, version_number, branch_name, parent_version_id, 
              created_at, is_active, is_favorite
       FROM resume_versions 
       WHERE user_id = ? 
       ORDER BY created_at ASC`
    )
    .all(userId) as any[]

  // Build tree structure
  const versionMap = new Map()
  const roots: any[] = []

  versions.forEach((version) => {
    versionMap.set(version.id, {
      ...version,
      children: [],
      stats: getResumeVersionStats(version.id)
    })
  })

  versions.forEach((version) => {
    const node = versionMap.get(version.id)
    if (version.parent_version_id && versionMap.has(version.parent_version_id)) {
      const parent = versionMap.get(version.parent_version_id)
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

/**
 * Get branches (unique branch names with their latest versions)
 */
export function getResumeBranches(userId: number) {
  const db = getDatabase()

  const branches = db
    .prepare(
      `SELECT DISTINCT branch_name, 
              (SELECT id FROM resume_versions rv2 
               WHERE rv2.user_id = resume_versions.user_id 
               AND rv2.branch_name = resume_versions.branch_name 
               ORDER BY created_at DESC LIMIT 1) as latest_version_id,
              (SELECT COUNT(*) FROM resume_versions rv3
               WHERE rv3.user_id = resume_versions.user_id
               AND rv3.branch_name = resume_versions.branch_name) as version_count
       FROM resume_versions 
       WHERE user_id = ?
       GROUP BY branch_name
       ORDER BY branch_name`
    )
    .all(userId) as any[]

  return branches.map((branch) => ({
    branchName: branch.branch_name,
    latestVersionId: branch.latest_version_id,
    versionCount: branch.version_count,
    stats: getResumeVersionStats(branch.latest_version_id)
  }))
}

/**
 * Compare two resume versions
 */
export function compareResumeVersions(versionId1: number, versionId2: number) {
  const db = getDatabase()

  const version1 = db
    .prepare('SELECT * FROM resume_versions WHERE id = ?')
    .get(versionId1) as any

  const version2 = db
    .prepare('SELECT * FROM resume_versions WHERE id = ?')
    .get(versionId2) as any

  if (!version1 || !version2) {
    throw new Error('One or both versions not found')
  }

  return {
    version1: {
      ...version1,
      data: JSON.parse(version1.data_json),
      stats: getResumeVersionStats(versionId1)
    },
    version2: {
      ...version2,
      data: JSON.parse(version2.data_json),
      stats: getResumeVersionStats(versionId2)
    }
  }
}

/**
 * Get version history for a specific branch
 */
export function getBranchHistory(userId: number, branchName: string) {
  const db = getDatabase()

  const versions = db
    .prepare(
      `SELECT * FROM resume_versions 
       WHERE user_id = ? AND branch_name = ?
       ORDER BY created_at DESC`
    )
    .all(userId, branchName) as any[]

  return versions.map((version) => ({
    ...version,
    stats: getResumeVersionStats(version.id)
  }))
}

