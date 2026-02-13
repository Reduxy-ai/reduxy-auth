# Reduxy Auth Service

Centralized authentication service for Reduxy platform. Provides simple redirect-based SSO with cookie-based sessions across all Reduxy services.

## Overview

This service handles:
- User authentication with email/password
- User registration with different membership plans
- Session management across Reduxy services (website, dashboard) via shared cookies
- Unified logout across all services

## Architecture

The authentication flow uses a simple redirect-based approach with shared cookies:

```
Website/Dashboard
    ↓ Redirect to login
Auth Service (auth.reduxy.ai)
    ↓ User logs in
Auth Service sets cookie (domain: .reduxy.ai)
    ↓ Redirect back
Website/Dashboard (cookie automatically sent)
    → User authenticated
```

## Endpoints

### Pages
- `GET /login?redirect_uri=<url>` - Login page (email/password form)
- `GET /register?redirect_uri=<url>` - Registration page (multi-step: plan selection + user details)
- `GET /logout?redirect_uri=<url>` - Logout page (clears session and redirects)

### API Routes
- `POST /api/auth/login` - Authenticate user, set cookie, return redirect_uri
- `POST /api/auth/register` - Create new user, set cookie, return redirect_uri
- `POST /api/auth/logout` - Clear session cookie, return redirect_uri
- `GET /api/auth/me` - Get current user from session cookie

## Environment Variables

```env
# Database (Supabase)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Cookie domain (must be .reduxy.ai for cross-subdomain cookies)
COOKIE_DOMAIN=.reduxy.ai

# Service URLs
NEXT_PUBLIC_AUTH_URL=https://auth.reduxy.ai

# Environment
NODE_ENV=production
```

## Running Locally

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

The service will run on http://localhost:3002

## Authentication Flow

### Login Flow
1. User visits website or dashboard
2. Website/dashboard redirects to `auth.reduxy.ai/login?redirect_uri=<return_url>`
3. User enters credentials on login page
4. Login page calls `/api/auth/login` with credentials + redirect_uri
5. API validates credentials and sets `reduxy_auth_session` cookie (domain: .reduxy.ai)
6. API returns success with redirect_uri
7. Login page redirects to redirect_uri
8. Website/dashboard receives user with cookie already set
9. Website/dashboard calls `/api/auth/me` to get user info

### Registration Flow
1. User visits website or dashboard
2. Website/dashboard redirects to `auth.reduxy.ai/register?redirect_uri=<return_url>`
3. User selects plan and fills in registration form
4. Register page calls `/api/auth/register` with user data + redirect_uri
5. API creates user and sets `reduxy_auth_session` cookie (domain: .reduxy.ai)
6. API returns success with redirect_uri
7. Register page redirects to redirect_uri
8. Website/dashboard receives user with cookie already set
9. Website/dashboard calls `/api/auth/me` to get user info

### Logout Flow
1. User clicks "Logout" on website/dashboard
2. Website/dashboard redirects to `auth.reduxy.ai/logout?redirect_uri=<return_url>`
3. Logout page calls `/api/auth/logout` with redirect_uri
4. API clears `reduxy_auth_session` cookie
5. API returns success with redirect_uri
6. Logout page redirects to redirect_uri
7. User is logged out from all services (cookie cleared)

## Database

Uses PostgreSQL database with the following tables:
- `users` - User accounts and authentication
- `user_preferences` - User settings and preferences
- `api_keys` - API keys for programmatic access
- `policies` - PII detection policies
- `billing_info` - Subscription and billing data

## Security

- httpOnly cookies prevent XSS attacks
- sameSite: 'none' with secure flag for cross-site cookies in production
- Passwords hashed with bcrypt
- Session cookies shared across *.reduxy.ai domains
- redirect_uri validation to prevent open redirects
- API keys hashed for storage

## Deployment

Deploy to Vercel:

```bash
vercel deploy
```

Set environment variables in Vercel dashboard.

## Integration

### Website/Dashboard Integration
```typescript
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'https://auth.reduxy.ai'

// Login - redirect to auth service
function login() {
  const returnUrl = encodeURIComponent(window.location.href)
  window.location.href = `${AUTH_URL}/login?redirect_uri=${returnUrl}`
}

// Logout - redirect to auth service
function logout() {
  const returnUrl = encodeURIComponent(window.location.origin)
  window.location.href = `${AUTH_URL}/logout?redirect_uri=${returnUrl}`
}

// Check session - call from useEffect on page load
async function checkSession() {
  const response = await fetch(`${AUTH_URL}/api/auth/me`, {
    method: 'GET',
    credentials: 'include', // Important: send cookies
  })

  if (response.ok) {
    const data = await response.json()
    return data.user
  }
  return null
}

// Make authenticated API calls - cookie automatically sent
async function callAPI(endpoint: string) {
  const response = await fetch(endpoint, {
    credentials: 'include', // Important: send cookies
  })
  return response.json()
}
```
