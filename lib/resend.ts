import { Resend } from 'resend'

let resendClient: Resend | null = null

/** Get or initialize the Resend client instance */
export function getResendClient(): Resend {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY
    if (!key || !key.trim()) {
      throw new Error(
        'RESEND_API_KEY environment variable is not configured. Check .env.local or production settings.'
      )
    }
    resendClient = new Resend(key.trim())
  }
  return resendClient
}

/** Proxy for backwards compatibility with `resend.emails.send(...)` */
export const resend: Resend = new Proxy({} as Resend, {
  get(_target, prop) {
    const client = getResendClient()
    const val = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof val === 'function' ? val.bind(client) : val
  },
})

/**
 * Get the configured sender email address.
 * Uses the verified custom domain Language Labs <noreply@languagelabs.lk> by default,
 * or the RESEND_FROM_EMAIL environment variable if explicitly configured.
 */
export function getFromEmail(): string {
  const configured = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM
  if (configured && configured.trim()) {
    return configured.trim()
  }
  return 'Language Labs <noreply@languagelabs.lk>'
}

/** Check if the sender is using Resend's sandbox / onboarding domain */
export function isSandboxFromAddress(from: string): boolean {
  return from.includes('onboarding@resend.dev')
}

/** Sanitize an email address (trim & lowercase) */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Validate email format using RFC 5322 regex */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  return emailRegex.test(email)
}

/** Check if a Resend error is due to free-tier sandbox recipient restrictions */
export function isSandboxRestrictionError(
  error: { message?: string; statusCode?: number | null } | null | undefined
): boolean {
  if (!error) return false
  const msg = (error.message || '').toLowerCase()
  const is403 = error.statusCode === 403
  return (
    is403 ||
    msg.includes('only send testing emails to your own email address') ||
    msg.includes('resend.com/domains')
  )
}

/** Custom error class preserving full Resend error details */
export class ResendDeliveryError extends Error {
  statusCode: number
  errorName: string
  isSandboxRestriction: boolean
  recipient: string | string[]

  constructor(
    message: string,
    statusCode = 500,
    errorName = 'resend_error',
    isSandboxRestriction = false,
    recipient: string | string[] = ''
  ) {
    super(message)
    this.name = 'ResendDeliveryError'
    this.statusCode = statusCode
    this.errorName = errorName
    this.isSandboxRestriction = isSandboxRestriction
    this.recipient = recipient
  }
}

export interface EmailAttachment {
  filename: string
  /** Base64-encoded file content */
  content: string
}

export interface SendEmailResult {
  success: boolean
  id?: string
  sandbox?: boolean
  relayedTo?: string
  warning?: string
}

/**
 * Send an email through Resend with comprehensive validation,
 * structured error logging, and graceful sandbox fallback for students.
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  attachments?: EmailAttachment[]
): Promise<SendEmailResult> {
  const from = getFromEmail()

  // 1. Sanitize & validate recipients
  const recipients = Array.isArray(to) ? to.map(sanitizeEmail) : [sanitizeEmail(to)]

  for (const r of recipients) {
    if (!isValidEmail(r)) {
      throw new ResendDeliveryError(
        `Invalid recipient email address: '${r}'`,
        400,
        'invalid_recipient',
        false,
        r
      )
    }
  }

  const cleanSubject = subject.trim()
  if (!cleanSubject) {
    throw new ResendDeliveryError('Email subject is required', 400, 'missing_subject')
  }

  const targetRecipient = recipients.length === 1 ? recipients[0] : recipients

  // 2. Attempt primary dispatch via Resend
  const { data, error } = await resend.emails.send({
    from,
    to: targetRecipient,
    subject: cleanSubject,
    html,
    ...(attachments?.length ? { attachments } : {}),
  })

  if (!error && data?.id) {
    return { success: true, id: data.id }
  }

  // 3. Handle errors with structured logging
  const isSandbox = isSandboxRestrictionError(error)
  const adminEmail = process.env.ADMIN_EMAIL ? sanitizeEmail(process.env.ADMIN_EMAIL) : null

  console.error('[Resend Error]', {
    statusCode: error?.statusCode,
    name: error?.name,
    message: error?.message,
    from,
    to: targetRecipient,
    subject: cleanSubject,
    isSandboxRestriction: isSandbox,
  })

  // 4. Graceful Sandbox Handling for Student Emails:
  // When using Resend's testing domain (onboarding@resend.dev), Resend restricts delivery
  // exclusively to the verified account owner (ADMIN_EMAIL). If a student email is blocked
  // by this sandbox restriction, relay the email to the admin with a diagnostic header so
  // OTPs, results, and notifications are not dropped.
  if (isSandbox && adminEmail) {
    console.warn(
      `⚠️ [Resend Sandbox Relay] Domain '${from}' is unverified in Resend. Relaying student email intended for '${recipients.join(
        ', '
      )}' to admin test inbox '${adminEmail}'. Verify your domain at https://resend.com/domains to enable direct student delivery.`
    )

    const sandboxNotice = `
      <div style="background-color:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:14px 18px;margin-bottom:20px;font-family:Arial,Helvetica,sans-serif;color:#92400E;font-size:13px;line-height:1.5;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#B45309;">🧪 Resend Sandbox Mode Notice</p>
        <p style="margin:0 0 4px;">This email was intended for student: <strong>${recipients.join(
          ', '
        )}</strong></p>
        <p style="margin:0 0 4px;">Because sender domain (<code>${from}</code>) is unverified, Resend sandbox restrictions only permit delivery to your admin email (<code>${adminEmail}</code>).</p>
        <p style="margin:0;">To deliver directly to students, verify your custom domain at <a href="https://resend.com/domains" style="color:#B45309;font-weight:bold;">resend.com/domains</a> and set <code>RESEND_FROM_EMAIL</code>.</p>
      </div>`

    const relayedHtml = sandboxNotice + html
    const relayedSubject = `[Sandbox for ${recipients.join(', ')}] ${cleanSubject}`

    const relayResult = await resend.emails.send({
      from,
      to: adminEmail,
      subject: relayedSubject,
      html: relayedHtml,
      ...(attachments?.length ? { attachments } : {}),
    })

    if (!relayResult.error && relayResult.data?.id) {
      return {
        success: true,
        id: relayResult.data.id,
        sandbox: true,
        relayedTo: adminEmail,
        warning: `Sent via Resend sandbox mode. Relayed to admin (${adminEmail}) because domain '${from}' is not yet verified.`,
      }
    }

    // If relaying also failed, log and throw
    console.error('[Resend Sandbox Relay Failed]', relayResult.error)
  }

  // 5. Throw custom error preserving details
  throw new ResendDeliveryError(
    error?.message || 'Failed to send email via Resend',
    error?.statusCode || 500,
    error?.name || 'resend_error',
    isSandbox,
    targetRecipient
  )
}

/** Send the 6-digit OTP verification email to a student */
export async function sendOTPEmail(
  to: string,
  firstName: string,
  code: string
): Promise<SendEmailResult> {
  return sendEmail(
    to,
    'Your Language Labs Verification Code',
    otpEmailHtml(firstName, code)
  )
}

/** Send a branded notification email to the admin (ADMIN_EMAIL env var) */
export async function sendAdminNotification(
  subject: string,
  bodyHtml: string
): Promise<SendEmailResult> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    throw new ResendDeliveryError(
      'ADMIN_EMAIL environment variable is not configured',
      500,
      'missing_admin_email'
    )
  }
  return sendEmail(adminEmail, subject, brandedEmailHtml(bodyHtml))
}

/** Wrap body HTML in the branded Language Labs email shell */
export function brandedEmailHtml(bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#E6F1FB;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#0A1628;padding:24px 32px;text-align:center;">
                <span style="font-size:20px;font-weight:bold;color:#FFFFFF;">🧪 Language <span style="color:#1E90FF;">Labs</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;color:#0A1628;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="background-color:#0A1628;padding:14px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#FFFFFF;">Language Labs — Learn English the scientific way</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function otpEmailHtml(firstName: string, code: string): string {
  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#E6F1FB;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#0A1628;padding:28px 32px;text-align:center;">
                <span style="font-size:22px;font-weight:bold;color:#FFFFFF;">🧪 Language <span style="color:#1E90FF;">Labs</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;color:#0A1628;">Hi ${firstName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#0A1628;line-height:1.6;">
                  Welcome to the lab! Here is your verification code to complete
                  your registration experiment:
                </p>
                <div style="background-color:#E6F1FB;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                  <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1E90FF;">${code}</span>
                </div>
                <p style="margin:0 0 8px;font-size:14px;color:#0A1628;">
                  ⏳ This code expires in <strong>10 minutes</strong>.
                </p>
                <p style="margin:0;font-size:13px;color:#6B7280;">
                  If you didn't request this code, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#0A1628;padding:16px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#FFFFFF;">
                  Language Labs — Learn English the scientific way
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
