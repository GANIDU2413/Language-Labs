'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { User } from '@/types'

const AUTH_COOKIE = 'll-auth'

/**
 * Mirror the signed-in role into a cookie so middleware.ts can route
 * requests. This is a UX convenience only — real access control lives in
 * Firestore security rules.
 */
export function setAuthCookie(
  user: Pick<User, 'role' | 'dashboardUnlocked'>
): void {
  const value =
    user.role === 'admin'
      ? 'admin'
      : user.dashboardUnlocked
        ? 'student:confirmed'
        : 'student'
  document.cookie = `${AUTH_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
}

export function clearAuthCookie(): void {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`
}

/**
 * Auth state hook: Firebase Auth user + their Firestore users document.
 * Keeps the middleware cookie in sync with the signed-in user.
 */
export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (!fbUser) {
        setUser(null)
        clearAuthCookie()
        setLoading(false)
        return
      }
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid))
        if (snap.exists()) {
          const profile = snap.data() as User
          setUser(profile)
          setAuthCookie(profile)
        } else {
          setUser(null)
          clearAuthCookie()
        }
      } catch {
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return {
    user,
    firebaseUser,
    loading,
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
    /** Payment confirmed by admin — dashboard is unlocked */
    isConfirmed: user?.dashboardUnlocked === true,
  }
}
