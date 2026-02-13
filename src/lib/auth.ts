import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
)

export interface JWTPayload {
    userId: string
    email: string
    plan: string
    iat?: number
    exp?: number
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
}

export async function createJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_SECRET)
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        return payload as unknown as JWTPayload
    } catch (error) {
        console.error('JWT verification failed:', error)
        return null
    }
}

/**
 * Verify session from NextRequest cookies
 * Returns the JWT payload if valid, null otherwise
 */
export async function verifySession(request: NextRequest): Promise<JWTPayload | null> {
    try {
        const token = request.cookies.get('reduxy_auth_token')?.value
        if (!token) {
            return null
        }
        return await verifyJWT(token)
    } catch (error) {
        console.error('Session verification failed:', error)
        return null
    }
}

export function generateApiKey(): string {
    const prefix = 'rdk_'
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = prefix
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

export function getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function formatPlanName(plan: string): string {
    return plan.charAt(0).toUpperCase() + plan.slice(1)
}

export function isTokenExpired(exp: number): boolean {
    return Date.now() >= exp * 1000
}

/**
 * Get auth token from localStorage (client-side only)
 * Returns null if not in browser or token not found
 */
export function getAuthToken(): string | null {
    if (typeof window === 'undefined') {
        return null
    }
    return localStorage.getItem('reduxy_auth_token')
}

/**
 * Set auth token in localStorage (client-side only)
 */
export function setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('reduxy_auth_token', token)
    }
}

/**
 * Remove auth token from localStorage (client-side only)
 */
export function removeAuthToken(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('reduxy_auth_token')
    }
}

/**
 * Generate a cryptographically secure authorization code
 * Format: 32-byte random string (64 hex characters)
 */
export function generateAuthorizationCode(): string {
    const array = new Uint8Array(32)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(array)
    } else {
        // Fallback for Node.js
        const nodeCrypto = require('crypto')
        nodeCrypto.randomFillSync(array)
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
} 