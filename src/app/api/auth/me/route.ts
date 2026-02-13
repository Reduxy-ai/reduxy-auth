import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database-server'

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
    const result = await query(
      `SELECT id, email, first_name, last_name, plan, company, is_email_verified, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [sessionCookie]
    )

    if (result.rows.length === 0) {
      return addCorsHeaders(
        NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        ),
        request
      )
    }

    const user = result.rows[0]

    return addCorsHeaders(
      NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          plan: user.plan,
          company: user.company,
          isEmailVerified: user.is_email_verified,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          // Add default values for credits (can be updated later if needed)
          credits_remaining: 1000000,
          credits_total: 1000000,
          credits_reset_at: null,
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
