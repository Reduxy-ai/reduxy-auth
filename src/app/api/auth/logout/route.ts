import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/logout
 * Clear authentication cookie and return success
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true })

    // Clear the auth cookie
    response.cookies.set('reduxy_auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Error during logout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
