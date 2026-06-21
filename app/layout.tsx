import type { Metadata } from 'next'
import './globals.css'
import NavLinks from '@/components/NavLinks'

export const metadata: Metadata = {
  title: 'AI Infra Tracker',
  description: 'AI Infrastructure Supply Chain Signal Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <nav className="nav">
            <span className="nav-brand">AI Infra Tracker</span>
            <NavLinks />
          </nav>
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
