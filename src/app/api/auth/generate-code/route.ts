import { NextRequest, NextResponse } from 'next/server'
import { generateAuthorizationCode } from '@/lib/auth'
import { query } from '@/lib/database'

/**
 * POST /api/auth/generate-code
 * Generate authorization code after successful login
 * Called by login page with user_id
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id, redirect_uri } = await request.json()

    if (!user_id || !redirect_uri) {
      return NextResponse.json(
        { error: 'user_id and redirect_uri are required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const users = await query<{ id: string }>(
      'SELECT id FROM users WHERE id = $1',
      [user_id]
    )

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate authorization code
    const code = generateAuthorizationCode()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Store in database
    await query(
      `
      INSERT INTO authorization_codes (code, user_id, redirect_uri, expires_at)
      VALUES ($1, $2, $3, $4)
      `,
      [code, user_id, redirect_uri, expiresAt]
    )

    // Return the code
    return NextResponse.json({ code })
  } catch (error) {
    console.error('Error generating authorization code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
