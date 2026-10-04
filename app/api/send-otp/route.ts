import { NextResponse } from 'next/server'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  isValidEmail,
  ResendDeliveryError,
  sanitizeEmail,
  sendOTPEmail,
} from '@/lib/resend'
import { formatName, generateOTP } from '@/lib/utils'

const OTP_EXPIRY_MINUTES = 10

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const rawEmail = typeof body.email === 'string' ? body.email : ''
    const cleanEmail = sanitizeEmail(rawEmail)

    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json(
        {
          error: 'A valid email address is required',
          code: 'invalid_email',
        },
        { status: 400 }
      )
    }

    const firstName =
      typeof body.firstName === 'string' && body.firstName.trim().length > 0
        ? formatName(body.firstName)
        : 'there'

    const code = generateOTP()
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
    )

    // Document id is the lowercased email, so a resend overwrites the previous code
    await setDoc(doc(db, 'otpCodes', cleanEmail), {
      email: cleanEmail,
      code,
      expiresAt,
      used: false,
      createdAt: Timestamp.now(),
    })

    const result = await sendOTPEmail(cleanEmail, firstName, code)

    return NextResponse.json({
      success: true,
      sandbox: result.sandbox ?? false,
      relayedTo: result.relayedTo,
      warning: result.warning,
      // Provide devCode in sandbox/development so testing is never blocked
      ...(result.sandbox || process.env.NODE_ENV !== 'production'
        ? { devCode: code }
        : {}),
    })
  } catch (err) {
    console.error('[API send-otp Error]', err)

    const statusCode = err instanceof ResendDeliveryError ? err.statusCode : 500
    const errorName =
      err instanceof ResendDeliveryError ? err.errorName : 'internal_error'
    const message =
      err instanceof Error ? err.message : 'Could not send the verification code.'

    return NextResponse.json(
      {
        error: 'Could not send the verification code. Please try again.',
        details: message,
        code: errorName,
        statusCode,
        isSandboxRestriction:
          err instanceof ResendDeliveryError
            ? err.isSandboxRestriction
            : false,
      },
      { status: statusCode }
    )
  }
}
