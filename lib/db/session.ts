import { nanoid } from 'nanoid'
import { cookies } from 'next/headers'
import getDatabase from './index'

const SESSION_COOKIE_NAME = 'app_session_id'
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export interface User {
  id: number
  session_id: string
  created_at: string
  updated_at: string
}

/**
 * Get or create user session
 * Returns user ID for database operations
 */
export async function getUserSession(): Promise<number> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value

  const db = getDatabase()

  if (sessionId) {
    // Check if session exists
    const user = db.prepare('SELECT * FROM users WHERE session_id = ?').get(sessionId) as User | undefined

    if (user) {
      return user.id
    }
  }

  // Create new session
  sessionId = nanoid(32)
  
  const result = db.prepare('INSERT INTO users (session_id) VALUES (?)').run(sessionId)
  
  // Set cookie
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: '/'
  })

  return result.lastInsertRowid as number
}

/**
 * Get user by session ID (for validation)
 */
export function getUserBySession(sessionId: string): User | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM users WHERE session_id = ?').get(sessionId) as User | undefined
}

/**
 * Delete user session (logout)
 */
export async function deleteUserSession(): Promise<void> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (sessionId) {
    const db = getDatabase()
    db.prepare('DELETE FROM users WHERE session_id = ?').run(sessionId)
    cookieStore.delete(SESSION_COOKIE_NAME)
  }
}

