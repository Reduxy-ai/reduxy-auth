import { NextRequest, NextResponse } from 'next/server'
import { generateAuthorizationCode } from '@/lib/auth'
import { query } from '@/lib/database'

/**
 * GET /api/auth/callback
 * OAuth callback - handles successful login from dashboard
 * Receives user_id, generates code and redirects
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')
    const redirectUri = searchParams.get('redirect_uri')
    const state = searchParams.get('state')

    if (!userId || !redirectUri) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Verify user exists
    const users = await query<{ id: string }>(
      'SELECT id FROM users WHERE id = $1',
      [userId]
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
      [code, userId, redirectUri, expiresAt]
    )

    // Build redirect URL with code
    const redirectUrl = new URL(redirectUri)
    redirectUrl.searchParams.set('code', code)
    if (state) {
      redirectUrl.searchParams.set('state', state)
    }

    // Redirect to original site with code
    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    console.error('Error in OAuth callback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
