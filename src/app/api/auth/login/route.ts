import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmailInDB } from '@/lib/database-server'
import { verifyPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const { email, password, redirect_uri } = await request.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            )
        }

        if (!redirect_uri) {
            return NextResponse.json(
                { error: 'redirect_uri is required' },
                { status: 400 }
            )
        }

        // Validate redirect_uri is from allowed domain
        const allowedDomains = [
            'https://www.reduxy.ai',
            'https://reduxy.ai',
            'https://dashboard.reduxy.ai',
            'http://localhost:3000',
            'http://localhost:3001'
        ]

        const redirectUrl = new URL(redirect_uri)
        const isAllowed = allowedDomains.some(domain => redirect_uri.startsWith(domain))

        if (!isAllowed) {
            return NextResponse.json(
                { error: 'Invalid redirect_uri' },
                { status: 400 }
            )
        }

        // Find user in database
        const user = await findUserByEmailInDB(email)
        if (!user) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            )
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, user.password)
        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            )
        }

        // Create success response
        const response = NextResponse.json({
            success: true,
            redirect_uri
        })

        // Set shared session cookie (used by website, dashboard, auth service)
        response.cookies.set('reduxy_auth_session', user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none', // 'none' required for cross-site cookies
            domain: process.env.COOKIE_DOMAIN || '.reduxy.ai',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/'
        })

        return response
    } catch (error) {
        console.error('Authentication error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
