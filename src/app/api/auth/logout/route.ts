import { NextRequest, NextResponse } from 'next/server'

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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

/**
 * POST /api/auth/logout
 * Clear shared session cookie across all services
 */
export async function POST(request: NextRequest) {
  try {
    const { redirect_uri } = await request.json()
    const finalRedirectUri = redirect_uri || 'https://www.reduxy.ai'

    const response = NextResponse.json({
      success: true,
      redirect_uri: finalRedirectUri
    })

    // Clear the shared session cookie
    response.cookies.set('reduxy_auth_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none', // Changed from 'lax' to 'none' for cross-site cookies
      domain: process.env.COOKIE_DOMAIN || '.reduxy.ai',
      maxAge: 0, // Expire immediately
      path: '/',
    })

    return addCorsHeaders(response, request)
  } catch (error) {
    console.error('Error during logout:', error)
    return addCorsHeaders(
      NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
      request
    )
  }
}
