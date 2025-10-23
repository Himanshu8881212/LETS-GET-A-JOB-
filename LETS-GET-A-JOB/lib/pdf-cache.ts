/**
 * PDF Caching Utility
 * Caches generated PDFs based on content hash to avoid regenerating identical documents
 */

import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'

const CACHE_DIR = path.join(process.cwd(), 'data', 'pdf-cache')
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const MAX_CACHE_SIZE_MB = 100 // Maximum cache size in MB

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
  } catch (error) {
    console.error('Failed to create cache directory:', error)
  }
}

/**
 * Generate hash from data object
 */
export function generateHash(data: any): string {
  const jsonString = JSON.stringify(data, Object.keys(data).sort())
  return crypto.createHash('sha256').update(jsonString).digest('hex')
}

/**
 * Get cached PDF if it exists and is not expired
 */
export async function getCachedPDF(hash: string): Promise<Buffer | null> {
  try {
    await ensureCacheDir()
    const cachePath = path.join(CACHE_DIR, `${hash}.pdf`)

    // Check if file exists
    try {
      await fs.access(cachePath)
    } catch {
      return null // File doesn't exist
    }

    // Check file age
    const stats = await fs.stat(cachePath)
    const age = Date.now() - stats.mtimeMs

    if (age > MAX_CACHE_AGE_MS) {
      // Cache expired, delete it
      await fs.unlink(cachePath).catch(() => { })
      return null
    }

    // Read and return cached PDF
    const buffer = await fs.readFile(cachePath)
    console.log(`Cache HIT: ${hash} (age: ${Math.round(age / 1000 / 60)} minutes)`)
    return buffer
  } catch (error) {
    console.error('Error reading cached PDF:', error)
    return null
  }
}

/**
 * Save PDF to cache
 */
export async function cachePDF(hash: string, pdfBuffer: Buffer): Promise<void> {
  try {
    await ensureCacheDir()
    const cachePath = path.join(CACHE_DIR, `${hash}.pdf`)

    await fs.writeFile(cachePath, pdfBuffer)
    console.log(`Cache SAVE: ${hash} (${Math.round(pdfBuffer.length / 1024)} KB)`)

    // Clean up old cache files if needed
    await cleanupCache()
  } catch (error) {
    console.error('Error caching PDF:', error)
  }
}

/**
 * Clean up old cache files
 */
async function cleanupCache() {
  try {
    const files = await fs.readdir(CACHE_DIR)
    const now = Date.now()
    let totalSize = 0

    // Get file stats
    const fileStats = await Promise.all(
      files
        .filter(f => f.endsWith('.pdf'))
        .map(async (file) => {
          const filePath = path.join(CACHE_DIR, file)
          const stats = await fs.stat(filePath)
          return {
            path: filePath,
            size: stats.size,
            mtime: stats.mtimeMs,
            age: now - stats.mtimeMs
          }
        })
    )

    // Delete expired files
    for (const file of fileStats) {
      if (file.age > MAX_CACHE_AGE_MS) {
        await fs.unlink(file.path).catch(() => { })
        console.log(`Cache CLEANUP: Deleted expired file ${path.basename(file.path)}`)
      } else {
        totalSize += file.size
      }
    }

    // If cache is too large, delete oldest files
    const maxSizeBytes = MAX_CACHE_SIZE_MB * 1024 * 1024
    if (totalSize > maxSizeBytes) {
      const sortedFiles = fileStats
        .filter(f => f.age <= MAX_CACHE_AGE_MS)
        .sort((a, b) => a.mtime - b.mtime) // Oldest first

      let currentSize = totalSize
      for (const file of sortedFiles) {
        if (currentSize <= maxSizeBytes) break

        await fs.unlink(file.path).catch(() => { })
        currentSize -= file.size
        console.log(`Cache CLEANUP: Deleted old file ${path.basename(file.path)} to reduce cache size`)
      }
    }
  } catch (error) {
    console.error('Error cleaning up cache:', error)
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    await ensureCacheDir()
    const files = await fs.readdir(CACHE_DIR)
    const pdfFiles = files.filter(f => f.endsWith('.pdf'))

    let totalSize = 0
    let oldestFile = Date.now()
    let newestFile = 0

    for (const file of pdfFiles) {
      const stats = await fs.stat(path.join(CACHE_DIR, file))
      totalSize += stats.size
      oldestFile = Math.min(oldestFile, stats.mtimeMs)
      newestFile = Math.max(newestFile, stats.mtimeMs)
    }

    return {
      fileCount: pdfFiles.length,
      totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      oldestFileAge: oldestFile === Date.now() ? 0 : Math.round((Date.now() - oldestFile) / 1000 / 60),
      newestFileAge: newestFile === 0 ? 0 : Math.round((Date.now() - newestFile) / 1000 / 60),
      maxSizeMB: MAX_CACHE_SIZE_MB,
      maxAgeDays: MAX_CACHE_AGE_MS / (24 * 60 * 60 * 1000)
    }
  } catch (error) {
    console.error('Error getting cache stats:', error)
    return null
  }
}

/**
 * Clear all cached PDFs
 */
export async function clearCache() {
  try {
    await ensureCacheDir()
    const files = await fs.readdir(CACHE_DIR)

    for (const file of files) {
      if (file.endsWith('.pdf')) {
        await fs.unlink(path.join(CACHE_DIR, file))
      }
    }

    console.log(`Cache CLEAR: Deleted ${files.length} files`)
    return { deleted: files.length }
  } catch (error) {
    console.error('Error clearing cache:', error)
    return { deleted: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

