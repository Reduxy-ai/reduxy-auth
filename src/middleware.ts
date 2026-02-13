import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  // For all other requests, add CORS headers to the response
  const response = NextResponse.next()

  response.headers.set(
    'Access-Control-Allow-Origin',
    request.headers.get('origin') || '*'
  )
  response.headers.set('Access-Control-Allow-Credentials', 'true')

  return response
}

// Apply middleware to API routes only
export const config = {
  matcher: '/api/:path*',
}
