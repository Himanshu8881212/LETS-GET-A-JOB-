import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Resume & Cover Letter Generator',
  description: 'Professional resume and cover letter generator with LaTeX',
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

