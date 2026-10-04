import { NextResponse } from 'next/server'
import { doc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  deleteFirebaseAuthUser,
  setFirebaseAuthUserDisabled,
} from '@/lib/firebase-admin'

interface RouteContext {
  params: Promise<{ studentId: string }>
}

/**
 * DELETE: Permanently delete a student's Firebase Auth account and server-locked OTP codes.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { studentId } = await context.params
    if (!studentId) {
      return NextResponse.json(
        { error: 'Missing studentId parameter' },
        { status: 400 }
      )
    }

    let email = ''
    try {
      const body = await request.json()
      if (body?.email) email = String(body.email).trim().toLowerCase()
    } catch {
      // Body may be empty
    }

    // 1. Delete Firebase Auth user account
    const authResult = await deleteFirebaseAuthUser(studentId)

    // 2. Clean up server-restricted OTP codes for the student's email
    if (email) {
      try {
        await deleteDoc(doc(db, 'otpCodes', email))
      } catch (err) {
        console.warn(`Could not delete otpCode for ${email}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      authDeleted: authResult.success,
      authNote: authResult.error ?? null,
    })
  } catch (err) {
    console.error('Error deleting student backend auth account:', err)
    return NextResponse.json(
      { error: 'Failed to process student deletion' },
      { status: 500 }
    )
  }
}

/**
 * PATCH: Disable or enable a student's Firebase Auth account.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { studentId } = await context.params
    if (!studentId) {
      return NextResponse.json(
        { error: 'Missing studentId parameter' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const disabled = Boolean(body?.disabled)

    // Update Firebase Auth user disabled state
    const authResult = await setFirebaseAuthUserDisabled(studentId, disabled)

    return NextResponse.json({
      success: true,
      disabled,
      authUpdated: authResult.success,
      authNote: authResult.error ?? null,
    })
  } catch (err) {
    console.error('Error toggling student disabled state:', err)
    return NextResponse.json(
      { error: 'Failed to update student status' },
      { status: 500 }
    )
  }
}
