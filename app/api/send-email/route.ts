import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'

/**
 * General email sender — booking confirmations, speaking results,
 * certificates, waiting list notifications.
 *
 * TODO: protect this endpoint (verify an admin session) before production —
 * as-is, anyone who discovers it could send emails from our address.
 */
export async function POST(request: Request) {
  try {
    const { to, subject, html, attachments } = await request.json()

    if (typeof to !== 'string' || !/^\S+@\S+\.\S+$/.test(to)) {
      return NextResponse.json(
        { error: 'A valid recipient email is required' },
        { status: 400 }
      )
    }
    if (typeof subject !== 'string' || subject.trim() === '') {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }
    if (typeof html !== 'string' || html.trim() === '') {
      return NextResponse.json(
        { error: 'Email content is required' },
        { status: 400 }
      )
    }

    const validAttachments = Array.isArray(attachments)
      ? attachments.filter(
          (a) =>
            a &&
            typeof a.filename === 'string' &&
            typeof a.content === 'string'
        )
      : undefined

    await sendEmail(to, subject.trim(), html, validAttachments)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('send-email failed:', err)
    return NextResponse.json(
      { error: 'Could not send the email' },
      { status: 500 }
    )
  }
}
