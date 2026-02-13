"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

function LogoutContent() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const performLogout = async () => {
      try {
        const redirectUri = searchParams.get('redirect_uri') || 'https://www.reduxy.ai'

        // Call logout API to clear shared cookie
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ redirect_uri: redirectUri }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          // Redirect back to original location
          window.location.href = data.redirect_uri
        } else {
          // Even if API fails, try to redirect
          window.location.href = redirectUri
        }
      } catch (error) {
        console.error('Logout error:', error)
        // On error, redirect to home
        const redirectUri = searchParams.get('redirect_uri') || 'https://www.reduxy.ai'
        window.location.href = redirectUri
      }
    }

    performLogout()
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800">
      <div className="text-white text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
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
