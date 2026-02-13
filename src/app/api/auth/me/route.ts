import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

/**
 * Add CORS headers to response
 */
function addCorsHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

/**
 * Handle CORS preflight request
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

/**
 * GET /api/auth/me
 * Get current user info from session cookie
 * Used by website and dashboard to verify session
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from session cookie
    const sessionCookie = request.cookies.get('reduxy_auth_session')?.value

    if (!sessionCookie) {
      return addCorsHeaders(
        NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        ),
        request
      )
    }

    // Get fresh user data from database
    const users = await query<{
      id: string
      email: string
      first_name: string
      last_name: string
      plan: string
      credits_remaining: number
      credits_total: number
      credits_reset_at: string | null
    }>(
      `
      SELECT id, email, first_name, last_name, plan,
             credits_remaining, credits_total, credits_reset_at
      FROM users
      WHERE id = $1
      `,
      [sessionCookie]
    )

    if (users.length === 0) {
      return addCorsHeaders(
        NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        ),
        request
      )
    }

    const user = users[0]

    return addCorsHeaders(
      NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          plan: user.plan,
          credits_remaining: user.credits_remaining,
          credits_total: user.credits_total,
          credits_reset_at: user.credits_reset_at,
        }
      }),
      request
    )
  } catch (error) {
    console.error('Error getting user info:', error)
    return addCorsHeaders(
      NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
      request
    )
  }
}
