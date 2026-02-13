import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET!

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined')
}

export interface JWTPayload {
  userId: string
  email: string
}

// Generate JWT token
export function generateJWT(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

// Verify JWT token
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

// Generate authorization code (for OAuth flow)
export function generateAuthorizationCode(): string {
  return randomBytes(32).toString('hex')
}

// Generate state parameter (for CSRF protection)
export function generateState(): string {
  return randomBytes(16).toString('hex')
}
