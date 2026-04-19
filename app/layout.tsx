import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from 'next/font/google'
import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/ui/Toast'

const ScoutChat = dynamic(() => import('@/components/ScoutChat'), { ssr: false })

const displayFont = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const bodyFont = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

const monoFont = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Headhunter — Career Workspace',
  description: 'Professional ATS-compatible resume and cover letter workspace with AI tailoring, evaluation, and job tracking.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} antialiased`}>
        <ErrorBoundary>
          <ToastProvider>
            {children}
            <ScoutChat />
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
