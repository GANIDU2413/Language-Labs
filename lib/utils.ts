import { FirebaseError } from 'firebase/app'

/** Map Firebase error codes to user-friendly messages */
export function friendlyFirebaseError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Try logging in instead.'
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect password. Please try again.'
      case 'auth/user-not-found':
        return 'No account found with this email.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a few minutes and try again.'
      case 'auth/network-request-failed':
        return 'Connection error. Please check your internet connection.'
      case 'auth/invalid-email':
        return 'That email address does not look right.'
      case 'auth/weak-password':
        return 'Please choose a stronger password.'
      case 'storage/unauthorized':
        return 'Upload failed. Please try again.'
      case 'permission-denied':
      case 'firestore/permission-denied':
        return 'Access denied. Please log in again.'
    }
  }
  return fallback
}

/** The 8 course modules taught in every lab */
export const COURSE_MODULES = [
  'Vocabulary',
  'Grammar',
  'Pronunciation',
  'Listening',
  'Speaking',
  'Day-to-Day English',
  'Interview Preparation',
  'Overall Fluency',
] as const

/** Generate a random 6-digit OTP code, e.g. "048291" */
export function generateOTP(): string {
  return Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0')
}

/** True when the OTP expiry time has passed */
export function isOTPExpired(expiresAt: Date): boolean {
  return Date.now() > expiresAt.getTime()
}

/** Format a date as a readable string, e.g. "16 July 2026" */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Build a wa.me link that opens WhatsApp with a pre-filled message.
 * Accepts numbers with spaces, dashes or a leading "+".
 */
export function getWhatsAppLink(number: string, message: string): string {
  const digits = number.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

/** Return a new array with the items in random order (Fisher–Yates shuffle) */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Extract the 11-character video id from a YouTube URL.
 * Supports watch, youtu.be, embed and shorts links.
 */
export function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  )
  return match ? match[1] : null
}

/**
 * Whole days from today until startDate.
 * Returns 0 when the date is today, negative when it has passed.
 */
export function getDaysRemaining(startDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfTarget = new Date(startDate)
  startOfTarget.setHours(0, 0, 0, 0)
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / msPerDay)
}

/**
 * Capitalizes a name: trims whitespace, capitalizes the first letter of each part,
 * and sets the remaining characters to lowercase (supporting spaces, hyphens, and apostrophes).
 *
 * Examples:
 *   formatName("john") => "John"
 *   formatName("JOHN") => "John"
 *   formatName("john doe") => "John Doe"
 *   formatName("JOHN DOE") => "John Doe"
 *   formatName("mary-jane") => "Mary-Jane"
 *   formatName("o'connor") => "O'Connor"
 */
export function formatName(name: string): string {
  if (!name) return ''
  return name
    .trim()
    .split(/\s+/)
    .map((word) =>
      word
        .split('-')
        .map((part) =>
          part
            .split("'")
            .map((sub) =>
              sub.length > 0
                ? sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase()
                : ''
            )
            .join("'")
        )
        .join('-')
    )
    .join(' ')
}

/**
 * Format first and last name and generate a trimmed fullName.
 */
export function formatFullName(
  firstName: string,
  lastName: string
): { firstName: string; lastName: string; fullName: string } {
  const formattedFirst = formatName(firstName)
  const formattedLast = formatName(lastName)
  return {
    firstName: formattedFirst,
    lastName: formattedLast,
    fullName: `${formattedFirst} ${formattedLast}`.trim(),
  }
}

