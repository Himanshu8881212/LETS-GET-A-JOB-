import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'
export const maxDuration = 10 // 10 seconds max

/**
 * Health Check Endpoint
 * Monitors database connectivity, file system access, and LaTeX availability
 * 
 * Returns:
 * - 200: All systems operational
 * - 503: One or more systems are down
 */
export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, any> = {}

  // 1. Database Health Check
  try {
    const db = getDatabase()
    const result = db.prepare('SELECT 1 as health').get()
    checks.database = {
      status: result && (result as any).health === 1 ? 'healthy' : 'unhealthy',
      message: 'Database connection successful'
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database connection failed'
    }
  }

  // 2. File System Health Check
  try {
    const dataDir = path.join(process.cwd(), 'data')
    await fs.access(dataDir)

    // Check if we can write to the data directory
    const testFile = path.join(dataDir, '.health-check')
    await fs.writeFile(testFile, 'test')
    await fs.unlink(testFile)

    checks.filesystem = {
      status: 'healthy',
      message: 'File system read/write successful'
    }
  } catch (error) {
    checks.filesystem = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'File system access failed'
    }
  }

  // 3. LaTeX Availability Check
  try {
    const { stdout } = await execAsync('pdflatex --version', { timeout: 5000 })
    const version = stdout.split('\n')[0]

    checks.latex = {
      status: 'healthy',
      message: 'LaTeX available',
      version: version.trim()
    }
  } catch (error) {
    checks.latex = {
      status: 'unhealthy',
      message: 'LaTeX not available or not installed'
    }
  }

  // 4. PDF Cache Directory Check
  try {
    const cacheDir = path.join(process.cwd(), 'data', 'pdf-cache')
    await fs.access(cacheDir).catch(async () => {
      await fs.mkdir(cacheDir, { recursive: true })
    })

    checks.pdfCache = {
      status: 'healthy',
      message: 'PDF cache directory accessible'
    }
  } catch (error) {
    checks.pdfCache = {
      status: 'warning',
      message: 'PDF cache directory not accessible (will be created on demand)'
    }
  }

  // 5. Memory Usage Check
  const memUsage = process.memoryUsage()
  checks.memory = {
    status: 'healthy',
    heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
    rssMB: Math.round(memUsage.rss / 1024 / 1024)
  }

  // Calculate overall status
  const allHealthy = Object.values(checks).every(
    check => check.status === 'healthy' || check.status === 'warning'
  )

  const responseTime = Date.now() - startTime

  const response = {
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    responseTimeMs: responseTime,
    checks,
    version: process.env.npm_package_version || 'unknown'
  }

  return NextResponse.json(
    response,
    {
      status: allHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    }
  )
}

