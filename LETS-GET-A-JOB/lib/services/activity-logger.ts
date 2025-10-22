import getDatabase from '../db'
import { headers } from 'next/headers'

export interface LogActivityParams {
  userId: number
  action: string
  entityType: 'resume' | 'cover_letter' | 'job_application'
  entityId?: number
  details?: string | object
}

/**
 * Log user activity for audit trail
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  const { userId, action, entityType, entityId, details } = params
  
  const db = getDatabase()
  
  // Get request metadata
  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'
  
  // Convert details to JSON string if it's an object
  const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details
  
  db.prepare(`
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, action, entityType, entityId || null, detailsStr || null, ipAddress, userAgent)
}

/**
 * Get activity logs for a user
 */
export function getActivityLogs(userId: number, limit: number = 100): any[] {
  const db = getDatabase()
  
  return db.prepare(`
    SELECT * FROM activity_logs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, limit)
}

/**
 * Get activity logs for a specific entity
 */
export function getEntityActivityLogs(
  userId: number,
  entityType: 'resume' | 'cover_letter' | 'job_application',
  entityId: number,
  limit: number = 50
): any[] {
  const db = getDatabase()
  
  return db.prepare(`
    SELECT * FROM activity_logs
    WHERE user_id = ? AND entity_type = ? AND entity_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, entityType, entityId, limit)
}

/**
 * Delete old activity logs (cleanup)
 */
export function cleanupOldLogs(daysToKeep: number = 90): number {
  const db = getDatabase()
  
  const result = db.prepare(`
    DELETE FROM activity_logs
    WHERE created_at < datetime('now', '-' || ? || ' days')
  `).run(daysToKeep)
  
  return result.changes
}

