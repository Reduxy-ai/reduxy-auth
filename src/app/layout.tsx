import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reduxy Auth',
  description: 'Authentication service for Reduxy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
