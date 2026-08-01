import Link from 'next/link'
import Logo from '@/components/layout/Logo'

const quickLinks = [
  { href: '/learning-materials', label: 'Learning Materials' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/login', label: 'Login' },
]

export default function Footer() {
  return (
    <footer className="bg-deep-blue text-lab-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-gray-400">
            Learn English the scientific way — level tests, lab batches and
            guided practice.
          </p>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Quick Links
          </p>
          <ul className="flex flex-col gap-2">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm transition-colors hover:text-electric-blue"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Language Labs. All rights reserved.
      </div>
    </footer>
  )
}
