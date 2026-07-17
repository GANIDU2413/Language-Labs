import { NextResponse, type NextRequest } from 'next/server'

/**
 * Route protection (Next.js proxy, formerly middleware) based on the 'll-auth' cookie set at login (see
 * hooks/useAuth.ts). The cookie is a routing hint, not proof of identity —
 * data access is enforced by Firestore security rules.
 *
 * Cookie values: 'admin' | 'student' | 'student:confirmed'
 */

const STUDENT_PATHS = [
  '/dashboard',
  '/profile',
  '/resources',
  '/tests',
  '/certificate',
  '/student',
]

export function proxy(request: NextRequest) {
  const role = request.cookies.get('ll-auth')?.value
  const { pathname } = request.nextUrl

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  const isStudentRoute = STUDENT_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )

  if (isAdminRoute) {
    if (!role) {
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  if (isStudentRoute) {
    if (!role) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    if (role !== 'student:confirmed') {
      // Logged in but payment not confirmed yet — login page shows the notice
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/admin',
    '/dashboard/:path*',
    '/dashboard',
    '/profile/:path*',
    '/profile',
    '/resources/:path*',
    '/resources',
    '/tests/:path*',
    '/tests',
    '/certificate/:path*',
    '/certificate',
    '/student/:path*',
  ],
}
