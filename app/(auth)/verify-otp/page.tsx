'use client'

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const CODE_LENGTH = 6
const RESEND_WAIT_SECONDS = 30

function VerifyOtpForm() {
  const router = useRouter()
  const email = useSearchParams().get('email') ?? ''

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [shake, setShake] = useState(false)
  const [resendIn, setResendIn] = useState(RESEND_WAIT_SECONDS)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  // Countdown for the resend link
  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [resendIn])

  function setDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, '')
    const next = [...digits]

    if (clean.length > 1) {
      // Autofill / fast typing: distribute the digits
      for (let i = 0; i < clean.length && index + i < CODE_LENGTH; i++) {
        next[index + i] = clean[i]
      }
    } else {
      next[index] = clean
    }
    setDigits(next)

    if (clean) {
      const focusIndex = Math.min(index + clean.length, CODE_LENGTH - 1)
      inputsRef.current[focusIndex]?.focus()
    }
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, CODE_LENGTH)
    if (!pasted) return
    const next = Array(CODE_LENGTH).fill('')
    pasted.split('').forEach((d, i) => (next[i] = d))
    setDigits(next)
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus()
  }

  async function verify() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: digits.join('') }),
      })
      const data = await res.json()

      if (data.success) {
        // Activate the account now that the email is verified
        if (auth.currentUser) {
          try {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
              status: 'active',
              emailVerified: true,
            })
          } catch {
            // Non-blocking — the account can be activated later
          }
        }
        setSuccess(true)
        setTimeout(() => router.push('/test'), 1600)
      } else {
        setError(data.error ?? 'Verification failed. Please try again.')
        setShake(true)
        setDigits(Array(CODE_LENGTH).fill(''))
        inputsRef.current[0]?.focus()
      }
    } catch {
      setError('Network problem — check your connection and try again.')
      setShake(true)
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    setResending(true)
    setError('')
    setResent(false)
    try {
      await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName: 'there' }),
      })
      setResent(true)
      setResendIn(RESEND_WAIT_SECONDS)
    } catch {
      setError('Could not resend the code. Please try again.')
    } finally {
      setResending(false)
    }
  }

  if (!email) {
    return (
      <Card className="w-full max-w-md text-center">
        <p className="text-deep-blue">
          No email address found. Please{' '}
          <Link href="/register" className="font-semibold text-electric-blue">
            register
          </Link>{' '}
          first.
        </p>
      </Card>
    )
  }

  if (success) {
    return (
      <Card className="w-full max-w-md text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl"
        >
          ✅
        </motion.div>
        <h1 className="text-2xl font-bold text-deep-blue">Email Verified!</h1>
        <p className="mt-2 text-sm text-gray-500">
          Taking you to your level test…
        </p>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6 text-center">
        <Link href="/" className="text-2xl font-bold text-deep-blue">
          🧪 Language <span className="text-electric-blue">Labs</span>
        </Link>
      </div>

      <h1 className="text-center text-2xl font-bold text-deep-blue">
        Check Your Email 📬
      </h1>
      <p className="mb-6 mt-2 text-center text-sm text-gray-500">
        We sent a 6-digit code to{' '}
        <span className="font-semibold text-deep-blue">{email}</span>. Enter it
        below to verify your account.
      </p>

      <motion.div
        animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        onAnimationComplete={() => setShake(false)}
        className="flex justify-center gap-2 sm:gap-3"
      >
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el
            }}
            value={digit}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${i + 1}`}
            className={`h-14 w-11 rounded-lab border-2 bg-lab-white text-center text-2xl font-bold text-deep-blue outline-none transition-colors focus:border-electric-blue sm:w-12 ${
              error ? 'border-seat-reserved' : 'border-gray-300'
            }`}
          />
        ))}
      </motion.div>

      {error && (
        <p className="mt-4 text-center text-sm text-seat-reserved">{error}</p>
      )}
      {resent && !error && (
        <p className="mt-4 text-center text-sm text-green-600">
          A new code is on its way! 🚀
        </p>
      )}

      <Button
        size="lg"
        loading={loading}
        disabled={digits.join('').length !== CODE_LENGTH}
        onClick={verify}
        className="mt-6 w-full"
      >
        Verify Code
      </Button>

      <p className="mt-6 text-center text-sm text-gray-500">
        {resendIn > 0 ? (
          <>Didn&apos;t get it? Resend in {resendIn}s</>
        ) : (
          <>
            Didn&apos;t get it?{' '}
            <button
              onClick={resend}
              disabled={resending}
              className="font-semibold text-electric-blue hover:underline disabled:opacity-50"
            >
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          </>
        )}
      </p>
    </Card>
  )
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <VerifyOtpForm />
    </Suspense>
  )
}
