'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { friendlyFirebaseError } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Logo from '@/components/layout/Logo'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { toast } from '@/hooks/useToast'

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})
type ForgotForm = z.infer<typeof forgotSchema>

const COOLDOWN_SECONDS = 60

function ForgotPasswordContent() {
  const searchParams = useSearchParams()
  const role = searchParams.get('role') === 'admin' ? 'admin' : 'student'

  const [serverError, setServerError] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  })

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  async function onSubmit(data: ForgotForm) {
    setServerError('')
    const cleanEmail = data.email.trim().toLowerCase()

    try {
      await sendPasswordResetEmail(auth, cleanEmail)
      setSubmittedEmail(cleanEmail)
      setCooldown(COOLDOWN_SECONDS)
      toast.success('Password reset link sent to your email!')
    } catch (err) {
      const message = friendlyFirebaseError(
        err,
        'Could not send the password reset email. Please try again.'
      )
      setServerError(message)
      toast.error(message)
    }
  }

  async function handleResend() {
    if (!submittedEmail || cooldown > 0) return
    setServerError('')

    try {
      await sendPasswordResetEmail(auth, submittedEmail)
      setCooldown(COOLDOWN_SECONDS)
      toast.success('A new password reset email has been sent!')
    } catch (err) {
      const message = friendlyFirebaseError(
        err,
        'Could not resend the reset email. Please try again.'
      )
      setServerError(message)
      toast.error(message)
    }
  }

  const backLoginUrl = role === 'admin' ? '/admin-login' : '/login'

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6 flex justify-center">
        <Logo theme="light" />
      </div>

      {submittedEmail ? (
        // Success state
        <div className="flex flex-col items-center text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-light text-2xl text-electric-blue">
            ✉️
          </div>
          <h1 className="text-2xl font-bold text-deep-blue">
            Check Your Email
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            We have sent a secure password reset link to:
          </p>
          <p className="mt-1 font-bold text-deep-blue break-all">
            {submittedEmail}
          </p>

          <div className="my-6 w-full rounded-lab border border-blue-light bg-blue-light/40 p-4 text-left text-xs leading-relaxed text-gray-600">
            <p className="font-semibold text-deep-blue mb-1">
              Next steps:
            </p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Open the email sent from Language Labs.</li>
              <li>Click the secure password reset link.</li>
              <li>Enter and confirm your new password.</li>
              <li>Return here to log in with your updated credentials.</li>
            </ol>
          </div>

          {serverError && (
            <div className="mb-4 w-full rounded-lab bg-red-50 p-3 text-xs leading-relaxed text-seat-reserved text-left">
              {serverError}
            </div>
          )}

          <div className="w-full space-y-3">
            <Link
              href={backLoginUrl}
              className="flex w-full items-center justify-center rounded-lab bg-electric-blue py-3 text-sm font-bold text-lab-white shadow-sm transition hover:bg-electric-blue/90"
            >
              Return to Login 🚀
            </Link>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="text-xs font-semibold text-gray-500 hover:text-deep-blue hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {cooldown > 0
                ? `Didn't receive the email? Resend in ${cooldown}s`
                : "Didn't receive the email? Resend link"}
            </button>
          </div>
        </div>
      ) : (
        // Initial form state
        <>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-light text-2xl">
              🔐
            </div>
            <h1 className="text-2xl font-bold text-deep-blue">
              Forgot Password?
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Enter your registered email address below. We will send you a secure link to reset your password.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-4"
          >
            <Input
              label="Registered Email Address"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              register={register('email')}
              error={errors.email?.message}
            />

            {serverError && (
              <div className="rounded-lab bg-red-50 p-3 text-xs leading-relaxed text-seat-reserved">
                {serverError}
              </div>
            )}

            <Button type="submit" size="lg" loading={isSubmitting}>
              Send Reset Link 📩
            </Button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-4 text-center">
            <p className="text-sm text-gray-500">
              Remember your password?{' '}
              <Link
                href={backLoginUrl}
                className="font-semibold text-electric-blue hover:underline"
              >
                Back to login
              </Link>
            </p>
          </div>
        </>
      )}
    </Card>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  )
}
