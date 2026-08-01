'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { clearAuthCookie, useAuth } from '@/hooks/useAuth'
import Logo from '@/components/layout/Logo'

const navItems = [
  { href: '/admin', icon: '🏠', label: 'Dashboard' },
  { href: '/admin/students', icon: '👥', label: 'Student Details' },
  { href: '/admin/labs/new', icon: '➕', label: 'New Lab Creation' },
  { href: '/admin/labs/not-started', icon: '🧪', label: 'New Labs' },
  { href: '/admin/labs/ongoing', icon: '⚗️', label: 'Ongoing Labs' },
  { href: '/admin/attendance', icon: '📋', label: 'Attendance' },
  { href: '/admin/resources', icon: '📁', label: 'Upload Resources' },
  { href: '/admin/test-materials', icon: '📝', label: 'Tests Materials' },
  { href: '/admin/speaking-review', icon: '🎙️', label: 'Review Speaking Tests' },
  { href: '/admin/inclass-test', icon: '⏱️', label: 'In-Class Test' },
  { href: '/admin/waiting-list', icon: '⏳', label: 'Waiting List' },
  { href: '/admin/profile', icon: '⚙️', label: 'Profile' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [unreviewedCount, setUnreviewedCount] = useState(0)

  // Live count of speaking tests waiting for review
  useEffect(() => {
    const q = query(
      collection(db, 'testResults'),
      where('reviewedByAdmin', '==', false)
    )
    const unsubscribe = onSnapshot(q, (snap) => setUnreviewedCount(snap.size))
    return unsubscribe
  }, [])

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  async function logout() {
    await signOut(auth)
    clearAuthCookie()
    router.push('/admin-login')
  }

  const reviewBadge = unreviewedCount > 0 && (
    <span className="ml-auto rounded-full bg-seat-reserved px-2 py-0.5 text-xs font-bold text-lab-white">
      {unreviewedCount}
    </span>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-deep-blue md:flex">
        {/* Logo */}
        <div className="border-b border-white/10 px-5 py-4">
          <Logo href="/admin" />
        </div>

        {/* Admin profile */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-electric-blue text-xl">
            🧑‍🔬
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-lab-white">
              {user?.fullName ?? 'Admin'}
            </p>
            <p className="text-xs text-electric-blue">Lab Administrator</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lab px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-electric-blue text-lab-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-lab-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                  {item.href === '/admin/speaking-review' && reviewBadge}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lab px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-seat-reserved/20 hover:text-lab-white"
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav — horizontally scrollable */}
      <nav className="fixed inset-x-0 bottom-0 z-40 bg-deep-blue md:hidden">
        <ul className="flex overflow-x-auto px-1 py-1.5">
          {navItems.map((item) => (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className={`relative flex w-16 flex-col items-center gap-0.5 rounded-lab px-1 py-1.5 text-center ${
                  isActive(item.href) ? 'bg-electric-blue' : ''
                }`}
              >
                <span className="text-lg">
                  {item.icon}
                  {item.href === '/admin/speaking-review' &&
                    unreviewedCount > 0 && (
                      <span className="absolute right-1 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-seat-reserved text-[10px] font-bold text-lab-white">
                        {unreviewedCount}
                      </span>
                    )}
                </span>
                <span className="w-full truncate text-[10px] text-lab-white">
                  {item.label}
                </span>
              </Link>
            </li>
          ))}
          <li className="shrink-0">
            <button
              onClick={logout}
              className="flex w-16 flex-col items-center gap-0.5 px-1 py-1.5"
            >
              <span className="text-lg">🚪</span>
              <span className="text-[10px] text-lab-white">Logout</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  )
}
