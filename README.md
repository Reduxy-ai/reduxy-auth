# Reduxy Auth Service

Minimal authentication service for Reduxy. Provides OAuth 2.0-style authentication flow between the website and dashboard.

## Overview

This service handles:
- User authentication via OAuth 2.0 authorization code flow
- Session management across Reduxy services
- Unified logout across all services

## Architecture

```
Website (reduxy.ai)
    ↓ login
Auth Service (auth.reduxy.ai)
    ↓ redirect to dashboard login
Dashboard (dashboard.reduxy.ai)
    ↓ after successful login
Auth Service (callback)
    ↓ generate authorization code
Website (with code)
    ↓ exchange code for user info
Auth Service (exchange)
    → User authenticated
```

## Endpoints

### Pages
- `GET /login` - Login page (redirects to dashboard)
- `GET /callback` - OAuth callback handler (internal)
- `GET /logout` - Logout page (clears all sessions)

### API Routes
- `POST /api/auth/exchange` - Exchange authorization code for user info
- `GET /api/auth/me` - Get current user from JWT token
- `POST /api/auth/logout` - Clear authentication cookies
- `GET /api/auth/callback` - OAuth callback (generates auth code)

## Environment Variables

```env
# Database (Supabase)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# JWT Secret (must match dashboard)
JWT_SECRET=your-secret-key

# Service URLs
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3000
NEXT_PUBLIC_WEBSITE_URL=http://localhost:3001
NEXT_PUBLIC_AUTH_URL=http://localhost:3002

# Environment
NODE_ENV=development
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
1. User clicks "Login" on website
2. Website redirects to `auth.reduxy.ai/login?redirect_uri=<website_url>`
3. Auth service redirects to `dashboard.reduxy.ai/login?callback_url=<auth_callback>&redirect_uri=<website_url>`
4. User logs in on dashboard
5. Dashboard redirects to `auth.reduxy.ai/api/auth/callback?user_id=<id>&redirect_uri=<website_url>`
6. Auth service generates one-time authorization code (5 min expiry)
7. Auth service redirects to `<website_url>?code=<code>`
8. Website exchanges code for user info via `/api/auth/exchange`
9. User is authenticated on website

### Logout Flow
1. User clicks "Logout" on website/dashboard
2. Redirects to `auth.reduxy.ai/logout?redirect_uri=<return_url>`
3. Auth service clears its cookies
4. Auth service redirects to `dashboard.reduxy.ai/logout?redirect=<return_url>`
5. Dashboard clears its cookies
6. Dashboard redirects to `<return_url>?logout=true`
7. Website detects logout flag and clears local storage
8. User is logged out from all services

## Database

Uses the same Supabase database as the dashboard. Requires:
- `users` table (for user data)
- `authorization_codes` table (for OAuth codes)

## Security

- Authorization codes are one-time use only
- Codes expire after 5 minutes
- JWT tokens used for session management
- httpOnly cookies prevent XSS attacks
- Shared secret between auth service and dashboard

## Deployment

Deploy to Vercel or any Node.js hosting:

```bash
npm run build
npm start
```

Set environment variables in your hosting platform.

## Integration

### Website Integration
```typescript
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL

// Login
function login() {
  const returnUrl = encodeURIComponent(window.location.href)
  window.location.href = `${AUTH_URL}/login?redirect_uri=${returnUrl}`
}

// Logout
function logout() {
  const returnUrl = encodeURIComponent(window.location.href)
  window.location.href = `${AUTH_URL}/logout?redirect_uri=${returnUrl}`
}

// Exchange code for user
async function exchangeCode(code: string) {
  const response = await fetch(`${AUTH_URL}/api/auth/exchange`, {
    method: 'POST',
    body: JSON.stringify({ code })
  })
  return response.json() // { user: {...} }
}
```

### Dashboard Integration
```typescript
// In login page, check for callback_url parameter
const callbackUrl = searchParams.get('callback_url')
const redirectUri = searchParams.get('redirect_uri')

// After successful login, redirect to callback
if (callbackUrl) {
  const url = new URL(callbackUrl)
  url.searchParams.set('user_id', user.id)
  url.searchParams.set('redirect_uri', redirectUri)
  window.location.href = url.toString()
}
```
