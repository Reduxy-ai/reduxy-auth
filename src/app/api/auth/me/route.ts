import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { query } from '@/lib/database'

/**
 * GET /api/auth/me
 * Get current user info from JWT token
 * Used to verify session and get fresh user data
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const cookieToken = request.cookies.get('reduxy_auth_token')?.value
    const authHeader = request.headers.get('Authorization')
    const headerToken = authHeader?.replace('Bearer ', '')

    const token = cookieToken || headerToken

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      )
    }

    // Verify JWT
    const payload = await verifyJWT(token)
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
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
      [payload.userId]
    )

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const user = users[0]

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error('Error getting user info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
