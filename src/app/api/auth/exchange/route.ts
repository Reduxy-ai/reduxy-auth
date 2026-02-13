import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

/**
 * POST /api/auth/exchange
 * Exchange authorization code for user info
 * Called by website/dashboard after redirect with code
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      )
    }

    // Look up the authorization code
    const authCodes = await query<{
      id: string
      user_id: string
      redirect_uri: string
      expires_at: string
      used: boolean
    }>(
      `
      SELECT id, user_id, redirect_uri, expires_at, used
      FROM authorization_codes
      WHERE code = $1
      `,
      [code]
    )

    if (authCodes.length === 0) {
      return NextResponse.json(
        { error: 'Invalid authorization code' },
        { status: 401 }
      )
    }

    const authCode = authCodes[0]

    // Check if code has been used
    if (authCode.used) {
      return NextResponse.json(
        { error: 'Authorization code has already been used' },
        { status: 401 }
      )
    }

    // Check if code has expired
    if (new Date(authCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Authorization code has expired' },
        { status: 401 }
      )
    }

    // Mark code as used (one-time use only)
    await query(
      `
      UPDATE authorization_codes
      SET used = true, used_at = NOW()
      WHERE id = $1
      `,
      [authCode.id]
    )

    // Get user info
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
      [authCode.user_id]
    )

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const user = users[0]

    // Return user info
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
    console.error('Error exchanging authorization code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
