import { NextRequest, NextResponse } from 'next/server'
import { createUserInDB, findUserByEmailInDB } from '@/lib/database-server'

export async function POST(request: NextRequest) {
    try {
        const { email, password, firstName, lastName, company, plan, agreeToTerms, redirect_uri } = await request.json()

        if (!email || !password || !firstName || !lastName || !plan) {
            return NextResponse.json(
                { error: 'All required fields must be provided' },
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

        const isAllowed = allowedDomains.some(domain => redirect_uri.startsWith(domain))

        if (!isAllowed) {
            return NextResponse.json(
                { error: 'Invalid redirect_uri' },
                { status: 400 }
            )
        }

        if (!agreeToTerms) {
            return NextResponse.json(
                { error: 'You must agree to the terms and conditions' },
                { status: 400 }
            )
        }

        // Check if user already exists
        const existingUser = await findUserByEmailInDB(email)
        if (existingUser) {
            return NextResponse.json(
                { error: 'This email is already registered. Please login instead or use a different email.' },
                { status: 409 }
            )
        }

        // Create new user in database (password already excluded from return value)
        const user = await createUserInDB({
            email,
            password,
            firstName,
            lastName,
            company,
            plan
        })

        // Create response
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
        console.error('Registration error:', error)

        let errorMessage = 'Registration failed. Please try again.'

        if (error instanceof Error) {
            if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
                errorMessage = 'This email is already registered. Please login instead.'
            } else if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
                errorMessage = 'Unable to connect to the database. Please try again later.'
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Request timed out. Please try again.'
            }
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}
