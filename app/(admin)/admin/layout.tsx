'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import AdminSidebar from '@/components/admin/AdminSidebar'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function AdminAreaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { loading, isAdmin } = useAuth()

  // Client-side guard on top of the proxy cookie check
  useEffect(() => {
    if (!loading && !isAdmin) router.push('/admin-login')
  }, [loading, isAdmin, router])

  if (loading || !isAdmin) return <LoadingSpinner size="lg" fullPage />

  return (
    <div className="min-h-screen bg-blue-light/40">
      <AdminSidebar />
      <div className="pb-24 md:pb-0 md:pl-64">{children}</div>
    </div>
  )
}
