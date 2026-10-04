import { getApps, initializeApp, cert, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'

function getAdminApp(): App | null {
  const apps = getApps()
  if (apps.length > 0) {
    return apps[0]!
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(
        serviceAccountJson.trim().startsWith('{')
          ? serviceAccountJson.trim()
          : Buffer.from(serviceAccountJson.trim(), 'base64').toString('utf8')
      )
      return initializeApp({
        credential: cert(parsed),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
    } catch (err) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', err)
    }
  }

  try {
    return initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  } catch (err) {
    console.warn('Firebase Admin SDK fallback initialization note:', err)
    return null
  }
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp()
  if (!app) return null
  try {
    return getAuth(app)
  } catch (err) {
    console.warn('Firebase Admin Auth unavailable:', err)
    return null
  }
}

export async function deleteFirebaseAuthUser(
  uid: string
): Promise<{ success: boolean; error?: string }> {
  const auth = getAdminAuth()
  if (!auth) {
    return {
      success: false,
      error: 'Firebase Admin Auth is not configured on the server.',
    }
  }

  try {
    await auth.deleteUser(uid)
    return { success: true }
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string }
    if (errorObj?.code === 'auth/user-not-found') {
      // User is already gone from Firebase Auth
      return { success: true }
    }
    console.warn(`Admin SDK deleteUser failed for uid ${uid}:`, errorObj?.message || err)
    return {
      success: false,
      error: errorObj?.message || 'Could not delete user from Firebase Auth.',
    }
  }
}

export async function setFirebaseAuthUserDisabled(
  uid: string,
  disabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const auth = getAdminAuth()
  if (!auth) {
    return {
      success: false,
      error: 'Firebase Admin Auth is not configured on the server.',
    }
  }

  try {
    await auth.updateUser(uid, { disabled })
    return { success: true }
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string }
    if (errorObj?.code === 'auth/user-not-found') {
      return { success: false, error: 'User not found in Firebase Auth.' }
    }
    console.warn(`Admin SDK updateUser disabled failed for uid ${uid}:`, errorObj?.message || err)
    return {
      success: false,
      error: errorObj?.message || 'Could not update user disabled state in Firebase Auth.',
    }
  }
}
