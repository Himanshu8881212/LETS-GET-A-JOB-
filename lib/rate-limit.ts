/**
 * Simple in-memory rate limiter
 * For production, consider using Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number = 5, windowMs: number = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000)
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier (e.g., user ID, IP address)
   * @returns Object with success status and remaining requests
   */
  check(identifier: string): { success: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const entry = this.limits.get(identifier)

    // No entry or expired entry
    if (!entry || now >= entry.resetTime) {
      const resetTime = now + this.windowMs
      this.limits.set(identifier, { count: 1, resetTime })
      return {
        success: true,
        remaining: this.maxRequests - 1,
        resetTime
      }
    }

    // Entry exists and not expired
    if (entry.count < this.maxRequests) {
      entry.count++
      return {
        success: true,
        remaining: this.maxRequests - entry.count,
        resetTime: entry.resetTime
      }
    }

    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup() {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.limits.forEach((entry, key) => {
      if (now >= entry.resetTime) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.limits.delete(key))
  }

  /**
   * Reset rate limit for a specific identifier
   */
  reset(identifier: string) {
    this.limits.delete(identifier)
  }

  /**
   * Get current stats for debugging
   */
  getStats() {
    return {
      totalEntries: this.limits.size,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs
    }
  }
}

// Create rate limiters for different endpoints
// PDF generation: 5 requests per minute
export const pdfRateLimiter = new RateLimiter(5, 60000)

// API requests: 30 requests per minute
export const apiRateLimiter = new RateLimiter(30, 60000)

/**
 * Helper function to format rate limit error response
 */
export function getRateLimitError(resetTime: number) {
  const resetDate = new Date(resetTime)
  const secondsUntilReset = Math.ceil((resetTime - Date.now()) / 1000)

  return {
    error: 'Rate limit exceeded',
    message: `Too many requests. Please try again in ${secondsUntilReset} seconds.`,
    retryAfter: secondsUntilReset,
    resetAt: resetDate.toISOString()
  }
}

