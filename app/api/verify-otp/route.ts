import { NextResponse } from 'next/server'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { isOTPExpired } from '@/lib/utils'
import type { OtpCode } from '@/types'

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()

    if (typeof email !== 'string' || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email and code are required' },
        { status: 400 }
      )
    }

    // Document id is the lowercased email (see send-otp)
    const otpRef = doc(db, 'otpCodes', email.toLowerCase())
    const snap = await getDoc(otpRef)

    if (!snap.exists() || (snap.data() as OtpCode).used) {
      return NextResponse.json(
        { success: false, error: 'No OTP found' },
        { status: 404 }
      )
    }

    const otp = snap.data() as OtpCode

    if (otp.code !== code.trim()) {
      return NextResponse.json(
        { success: false, error: 'Invalid code' },
        { status: 400 }
      )
    }

    if (isOTPExpired(otp.expiresAt.toDate())) {
      return NextResponse.json(
        { success: false, error: 'OTP expired' },
        { status: 400 }
      )
    }

    await updateDoc(otpRef, { used: true })

    return NextResponse.json({ success: true, verified: true })
  } catch (err) {
    console.error('verify-otp failed:', err)
    return NextResponse.json(
      { success: false, error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}
