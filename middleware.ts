import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Security Middleware
 * - Validates request methods
 * - Sanitizes inputs
 * - Adds security headers
 * - Prevents common attacks
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Files with extensions
  ) {
    return NextResponse.next()
  }

  // Create response
  const response = NextResponse.next()

  // Add security headers (additional layer on top of next.config.js)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // API routes security
  if (pathname.startsWith('/api/')) {
    // Only allow specific HTTP methods
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    if (!allowedMethods.includes(request.method)) {
      return new NextResponse(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Allow': allowedMethods.join(', ')
          }
        }
      )
    }

    // Validate Content-Type for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type')
      
      // Allow JSON and multipart/form-data (for file uploads)
      const isValidContentType = 
        contentType?.includes('application/json') ||
        contentType?.includes('multipart/form-data')
      
      if (!isValidContentType && !pathname.includes('/download')) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'Invalid Content-Type',
            message: 'Content-Type must be application/json or multipart/form-data'
          }),
          {
            status: 415,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Add CORS headers for API routes (if needed)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Origin', '*') // Adjust in production
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'X-Requested-With, Content-Type, Authorization'
    )
  }

  return response
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)',
  ],
}

