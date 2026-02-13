"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"

function LogoutContent() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const redirectUri = searchParams.get('redirect_uri')

    // Call logout API to clear any cookies on auth service
    fetch('/api/auth/logout', {
      method: 'POST',
    }).then(() => {
      console.log('Auth service session cleared')

      // Also notify dashboard to clear its session
      const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3000'

      if (redirectUri) {
        // Redirect to dashboard logout, which will then redirect to final destination
        const dashboardLogoutUrl = `${dashboardUrl}/logout?redirect=${encodeURIComponent(redirectUri)}`
        window.location.href = dashboardLogoutUrl
      } else {
        // No redirect specified, just go to dashboard
        window.location.href = dashboardUrl
      }
    }).catch(error => {
      console.error('Logout failed:', error)
      // Redirect anyway
      if (redirectUri) {
        window.location.href = redirectUri
      }
    })
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-lg">Logging out...</p>
      </div>
    </div>
  )
}

export default function LogoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    }>
      <LogoutContent />
    </Suspense>
  )
}
