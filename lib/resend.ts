import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

// TODO: change to a verified domain sender, e.g. 'Language Labs <hello@languagelabs.lk>'
const FROM = 'Language Labs <onboarding@resend.dev>'

/** Send the 6-digit OTP verification email to a student */
export async function sendOTPEmail(
  to: string,
  firstName: string,
  code: string
): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Language Labs Verification Code',
    html: otpEmailHtml(firstName, code),
  })

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`)
  }
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

export interface EmailAttachment {
  filename: string
  /** Base64-encoded file content */
  content: string
}

/** Send any email through Resend with error propagation */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[]
): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    ...(attachments?.length ? { attachments } : {}),
  })
  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

/** Send a branded notification email to the admin (ADMIN_EMAIL env var) */
export async function sendAdminNotification(
  subject: string,
  bodyHtml: string
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL environment variable is not set')
  }
  await sendEmail(adminEmail, subject, brandedEmailHtml(bodyHtml))
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
