import { NextResponse } from 'next/server'
import {
  isValidEmail,
  ResendDeliveryError,
  sanitizeEmail,
  sendEmail,
} from '@/lib/resend'

/**
 * General email sender — booking confirmations, speaking results,
 * certificates, waiting list notifications.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    const rawRecipients: string[] = Array.isArray(body.to)
      ? body.to.map((r: unknown) => (typeof r === 'string' ? r : ''))
      : [typeof body.to === 'string' ? body.to : '']

    const recipients = rawRecipients.map(sanitizeEmail).filter(Boolean)

    if (recipients.length === 0) {
      return NextResponse.json(
        {
          error: 'At least one recipient email address is required',
          code: 'missing_recipient',
        },
        { status: 400 }
      )
    }

    const invalidRecipients = recipients.filter((r) => !isValidEmail(r))
    if (invalidRecipients.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid recipient email address: '${invalidRecipients.join(', ')}'`,
          code: 'invalid_recipient',
        },
        { status: 400 }
      )
    }

    if (typeof body.subject !== 'string' || body.subject.trim() === '') {
      return NextResponse.json(
        { error: 'Email subject is required', code: 'missing_subject' },
        { status: 400 }
      )
    }

    if (typeof body.html !== 'string' || body.html.trim() === '') {
      return NextResponse.json(
        { error: 'Email content is required', code: 'missing_html' },
        { status: 400 }
      )
    }

    const validAttachments = Array.isArray(body.attachments)
      ? body.attachments.filter(
          (a: unknown) =>
            a &&
            typeof (a as { filename?: unknown }).filename === 'string' &&
            typeof (a as { content?: unknown }).content === 'string'
        )
      : undefined

    const result = await sendEmail(
      recipients.length === 1 ? recipients[0] : recipients,
      body.subject.trim(),
      body.html,
      validAttachments
    )

    return NextResponse.json({
      success: true,
      id: result.id,
      sandbox: result.sandbox ?? false,
      relayedTo: result.relayedTo,
      warning: result.warning,
    })
  } catch (err) {
    console.error('[API send-email Error]', err)

    const statusCode = err instanceof ResendDeliveryError ? err.statusCode : 500
    const errorName =
      err instanceof ResendDeliveryError ? err.errorName : 'internal_error'
    const message =
      err instanceof Error ? err.message : 'Could not send the email.'

    return NextResponse.json(
      {
        error: 'Could not send the email',
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
