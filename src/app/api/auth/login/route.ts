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

        // Create JWT token
        const token = await createJWT({
            userId: user.id,
            email: user.email,
            plan: user.plan
        })

        // Set cookie
        const response = NextResponse.json({
            user: userWithoutPassword,
            token
        })

        response.cookies.set('reduxy_auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: process.env.COOKIE_DOMAIN || undefined,
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
