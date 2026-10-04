'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getWhatsAppLink } from '@/lib/utils'
import { clearAuthCookie, useAuth } from '@/hooks/useAuth'
import Logo from '@/components/layout/Logo'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Progress' },
  { href: '/resources', icon: '📚', label: 'Resources' },
  { href: '/tests', icon: '✏️', label: 'Tests' },
  { href: '/certificate', icon: '🏅', label: 'Certificate' },
  { href: '/profile', icon: '👤', label: 'Profile' },
]

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, firebaseUser, loading, isAdmin, isConfirmed } = useAuth()

  // The level test flow (/test, /test/results) runs before enrollment
  // and keeps its own full-screen UI without the dashboard chrome
  const isTestFlow = pathname === '/test' || pathname.startsWith('/test/')

  useEffect(() => {
    if (isTestFlow || loading) return
    if (!firebaseUser || user?.disabled) {
      if (user?.disabled) signOut(auth).catch(() => {})
      router.push('/login')
    } else if (isAdmin) {
      router.push('/admin')
    }
  }, [isTestFlow, loading, firebaseUser, user?.disabled, isAdmin, router])

  if (isTestFlow) {
    return <main className="min-h-screen">{children}</main>
  }

  if (loading || !firebaseUser || isAdmin) {
    return <LoadingSpinner size="lg" fullPage />
  }

  // Logged in but payment not confirmed yet
  if (!isConfirmed) {
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    return (
      <main className="flex min-h-screen items-center justify-center bg-blue-light px-4">
        <Card className="w-full max-w-md text-center">
          <p className="text-4xl">⏳</p>
          <h1 className="mt-3 text-xl font-bold text-deep-blue">
            Almost in the lab!
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Your seat booking is pending payment confirmation. Please send your
            payment receipt via{' '}
            {whatsappNumber ? (
              <a
                href={getWhatsAppLink(
                  whatsappNumber,
                  'Hi! Here is my payment receipt for my Language Labs seat booking.'
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-electric-blue underline"
              >
                WhatsApp
              </a>
            ) : (
              'WhatsApp'
            )}{' '}
            and we&apos;ll unlock your dashboard.
          </p>
          <Button
            variant="ghost"
            className="mt-5"
            onClick={async () => {
              await signOut(auth)
              clearAuthCookie()
              router.push('/login')
            }}
          >
            Logout
          </Button>
        </Card>
      </main>
    )
  }

  async function logout() {
    await signOut(auth)
    clearAuthCookie()
    router.push('/login')
  }

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <div className="min-h-screen bg-blue-light/40">
      {/* Top navbar */}
      <header className="sticky top-0 z-40 bg-deep-blue">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-gray-300 sm:inline">
              {user?.fullName}
            </span>
            <button
              onClick={logout}
              className="rounded-lab border border-white/20 px-3 py-1.5 text-sm text-lab-white transition-colors hover:bg-white/10"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col gap-1 self-start px-3 py-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lab px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-electric-blue text-lab-white'
                  : 'text-deep-blue hover:bg-blue-light'
              }`}
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </aside>

        {/* Content */}
        <main className="min-h-screen w-full flex-1 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 bg-deep-blue md:hidden">
        <ul className="flex justify-around px-1 py-1.5">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex w-16 flex-col items-center gap-0.5 rounded-lab px-1 py-1.5 ${
                  isActive(item.href) ? 'bg-electric-blue' : ''
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] text-lab-white">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
