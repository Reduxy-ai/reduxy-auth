import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmailInDB } from '@/lib/database-server'
import { createJWT, verifyPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
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

        // Remove password from user object
        const { password: _, ...userWithoutPassword } = user

        // Create response
        const response = NextResponse.json({
            user: userWithoutPassword
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
