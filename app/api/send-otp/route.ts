import { NextResponse } from 'next/server'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { sendOTPEmail } from '@/lib/resend'
import { generateOTP } from '@/lib/utils'

const OTP_EXPIRY_MINUTES = 10

export async function POST(request: Request) {
  try {
    const { email, firstName } = await request.json()

    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      )
    }
    if (typeof firstName !== 'string' || firstName.trim() === '') {
      return NextResponse.json(
        { error: 'First name is required' },
        { status: 400 }
      )
    }

    const code = generateOTP()
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
    )

    // Document id is the email, so a resend overwrites the previous code
    await setDoc(doc(db, 'otpCodes', email.toLowerCase()), {
      email: email.toLowerCase(),
      code,
      expiresAt,
      used: false,
      createdAt: Timestamp.now(),
    })

    await sendOTPEmail(email, firstName.trim(), code)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('send-otp failed:', err)
    return NextResponse.json(
      { error: 'Could not send the verification code. Please try again.' },
      { status: 500 }
    )
  }
}
