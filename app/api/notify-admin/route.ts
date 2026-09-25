import { NextResponse } from 'next/server'
import { ResendDeliveryError, sendAdminNotification } from '@/lib/resend'

type NotificationType = 'speaking_review' | 'payment_receipt' | 'new_registration'

const templates: Record<
  NotificationType,
  (studentName: string) => { subject: string; headline: string }
> = {
  speaking_review: (name) => ({
    subject: 'New Speaking Test to Review',
    headline: `New speaking test ready to review from <strong>${name}</strong>.`,
  }),
  payment_receipt: (name) => ({
    subject: 'Payment Receipt Received',
    headline: `Payment receipt received from <strong>${name}</strong>.`,
  }),
  new_registration: (name) => ({
    subject: 'New Student Registration',
    headline: `New student registered: <strong>${name}</strong>.`,
  }),
}

export async function POST(request: Request) {
  try {
    const { type, studentName, studentEmail, message } = await request.json()

    if (typeof type !== 'string' || !(type in templates)) {
      return NextResponse.json(
        { error: 'A valid notification type is required', code: 'invalid_type' },
        { status: 400 }
      )
    }
    if (typeof studentName !== 'string' || studentName.trim() === '') {
      return NextResponse.json(
        { error: 'Student name is required', code: 'missing_name' },
        { status: 400 }
      )
    }

    const { subject, headline } = templates[type as NotificationType](
      studentName.trim()
    )

    const bodyHtml = `
      <p style="margin:0 0 12px;">Hi Admin,</p>
      <p style="margin:0 0 12px;">${headline}</p>
      ${message ? `<p style="margin:0 0 12px;color:#374151;">${message}</p>` : ''}
      ${
        studentEmail
          ? `<p style="margin:0 0 12px;font-size:13px;color:#6B7280;">Student email: ${studentEmail}</p>`
          : ''
      }
      <p style="margin:0;">Log in to the admin panel to take action.</p>`

    const result = await sendAdminNotification(subject, bodyHtml)

    return NextResponse.json({
      success: true,
      id: result.id,
      sandbox: result.sandbox ?? false,
    })
  } catch (err) {
    console.error('[API notify-admin Error]', err)

    const statusCode = err instanceof ResendDeliveryError ? err.statusCode : 500
    const errorName =
      err instanceof ResendDeliveryError ? err.errorName : 'internal_error'
    const message =
      err instanceof Error ? err.message : 'Could not send the notification.'

    return NextResponse.json(
      {
        error: 'Could not send the notification',
        details: message,
        code: errorName,
        statusCode,
      },
      { status: statusCode }
    )
  }
}
