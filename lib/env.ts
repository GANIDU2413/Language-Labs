/**
 * Startup environment check — imported by the root layout so it runs
 * server-side on boot/build and warns loudly about missing configuration
 * instead of failing with confusing runtime errors.
 */

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'RESEND_API_KEY',
  'ADMIN_EMAIL',
  'NEXT_PUBLIC_WHATSAPP_NUMBER',
]

if (typeof window === 'undefined') {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name])
  if (missing.length > 0) {
    console.warn(
      `⚠️  [Language Labs] Missing environment variables: ${missing.join(', ')} — related features will not work. Check .env.local (or Vercel project settings).`
    )
  }
}

export {}
