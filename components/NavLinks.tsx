'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/supply-chain',       label: 'Supply Chain' },
  { href: '/hyperscaler-silicon', label: 'Custom Silicon' },
  { href: '/signal-dashboard',   label: 'Signals' },
  { href: '/research-tool',      label: 'AI Research' },
]

export default function NavLinks() {
  const path = usePathname()
  return (
    <ul className="nav-links">
      {LINKS.map(link => (
        <li key={link.href}>
          <Link
            href={link.href}
            className={path.startsWith(link.href) ? 'active' : ''}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}
