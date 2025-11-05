import { getDatabase } from '../db/index'

/**
 * Get statistics for a specific cover letter version
 */
export function getCoverLetterVersionStats(versionId: number) {
  const db = getDatabase()

  const stats = db
    .prepare(
      `SELECT 
        COUNT(*) as total_applications,
        SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied_count,
        SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interview_count,
        SUM(CASE WHEN status = 'offer' THEN 1 ELSE 0 END) as offer_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
       FROM job_applications 
       WHERE cover_letter_version_id = ?`
    )
    .get(versionId) as any

  const totalApplications = stats.total_applications || 0
  const successRate =
    totalApplications > 0
      ? Math.round(((stats.offer_count || 0) / totalApplications) * 100)
      : 0

  return {
    totalApplications,
    appliedCount: stats.applied_count || 0,
    interviewCount: stats.interview_count || 0,
    offerCount: stats.offer_count || 0,
    rejectedCount: stats.rejected_count || 0,
    successRate
  }
}

/**
 * Get all cover letter versions with their statistics
 */
export function getCoverLetterVersionsWithStats(userId: number) {
  const db = getDatabase()

  const versions = db
    .prepare(
      `SELECT id, version_name, version_number, branch_name, parent_version_id, 
              created_at, is_active, is_favorite
       FROM cover_letter_versions 
       WHERE user_id = ? 
       ORDER BY created_at DESC`
    )
    .all(userId) as any[]

  return versions.map((version) => ({
    ...version,
    stats: getCoverLetterVersionStats(version.id)
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
       FROM cover_letter_versions 
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
      stats: getCoverLetterVersionStats(version.id)
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
export function getCoverLetterBranches(userId: number) {
  const db = getDatabase()

  const branches = db
    .prepare(
      `SELECT DISTINCT branch_name, 
              (SELECT id FROM cover_letter_versions cv2 
               WHERE cv2.user_id = cover_letter_versions.user_id 
               AND cv2.branch_name = cover_letter_versions.branch_name 
               ORDER BY created_at DESC LIMIT 1) as latest_version_id,
              (SELECT COUNT(*) FROM cover_letter_versions cv3
               WHERE cv3.user_id = cover_letter_versions.user_id
               AND cv3.branch_name = cover_letter_versions.branch_name) as version_count
       FROM cover_letter_versions 
       WHERE user_id = ?
       GROUP BY branch_name
       ORDER BY branch_name`
    )
    .all(userId) as any[]

  return branches.map((branch) => ({
    branchName: branch.branch_name,
    latestVersionId: branch.latest_version_id,
    versionCount: branch.version_count,
    stats: getCoverLetterVersionStats(branch.latest_version_id)
  }))
}

/**
 * Compare two cover letter versions
 */
export function compareCoverLetterVersions(versionId1: number, versionId2: number) {
  const db = getDatabase()

  const version1 = db
    .prepare('SELECT * FROM cover_letter_versions WHERE id = ?')
    .get(versionId1) as any

  const version2 = db
    .prepare('SELECT * FROM cover_letter_versions WHERE id = ?')
    .get(versionId2) as any

  if (!version1 || !version2) {
    throw new Error('One or both versions not found')
  }

  return {
    version1: {
      ...version1,
      data: JSON.parse(version1.data_json),
      stats: getCoverLetterVersionStats(versionId1)
    },
    version2: {
      ...version2,
      data: JSON.parse(version2.data_json),
      stats: getCoverLetterVersionStats(versionId2)
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
      `SELECT * FROM cover_letter_versions 
       WHERE user_id = ? AND branch_name = ?
       ORDER BY created_at DESC`
    )
    .all(userId, branchName) as any[]

  return versions.map((version) => ({
    ...version,
    stats: getCoverLetterVersionStats(version.id)
  }))
}

/**
 * Toggle favorite status for a cover letter version
 */
export function toggleCoverLetterFavorite(userId: number, versionId: number): boolean {
  const db = getDatabase()

  const version = db
    .prepare('SELECT is_favorite FROM cover_letter_versions WHERE id = ? AND user_id = ?')
    .get(versionId, userId) as { is_favorite: number } | undefined

  if (!version) {
    return false
  }

  const newFavoriteStatus = version.is_favorite === 1 ? 0 : 1

  db.prepare(
    'UPDATE cover_letter_versions SET is_favorite = ? WHERE id = ? AND user_id = ?'
  ).run(newFavoriteStatus, versionId, userId)

  return true
}

