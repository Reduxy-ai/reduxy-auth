"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"

function CallbackContent() {
  const searchParams = useSearchParams()

  useEffect(() => {
    // This page is reached after the user logs in via dashboard
    // The API route /api/auth/callback handles the actual OAuth flow
    // This page just shows a loading state while processing

    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('OAuth error:', error)
      // Could redirect to an error page or back to login
    } else if (code) {
      // Code received, API already processed it
      console.log('OAuth callback received code')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-lg">Processing authentication...</p>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
