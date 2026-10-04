'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { queryCollection } from '@/lib/firestore'
import { setAuthCookie } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { friendlyFirebaseError, getWhatsAppLink } from '@/lib/utils'
import Logo from '@/components/layout/Logo'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { Booking, User } from '@/types'

const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const toast = useToast()
  const [serverError, setServerError] = useState('')
  const [pendingPayment, setPendingPayment] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotHelp, setShowForgotHelp] = useState(false)

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER

  const storedRedirect =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('ll_intended_payment')
      : null
  const targetRedirect = redirectParam || storedRedirect

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginForm) {
    setServerError('')
    setPendingPayment(false)
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        data.email.toLowerCase(),
        data.password
      )

      const snap = await getDoc(doc(db, 'users', cred.user.uid))
      if (!snap.exists()) {
        setServerError('Account not found. Please register first.')
        return
      }
      const user = snap.data() as User
      if (user.disabled) {
        await auth.signOut()
        setServerError('Your account has been disabled. Please contact the administrator for assistance.')
        toast.error('Your account has been disabled. Please contact the administrator.')
        return
      }
      setAuthCookie(user)

      if (user.role === 'admin') {
        router.push('/admin')
        return
      }

      if (!user.emailVerified) {
        const verifyUrl = targetRedirect
          ? `/verify-otp?email=${encodeURIComponent(user.email)}&redirect=${encodeURIComponent(targetRedirect)}`
          : `/verify-otp?email=${encodeURIComponent(user.email)}`
        router.push(verifyUrl)
        return
      }

      // If user had an intended destination (e.g. payment page), go directly there!
      if (targetRedirect && targetRedirect.startsWith('/')) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('ll_intended_payment')
        }
        router.push(targetRedirect)
        return
      }

      if (user.dashboardUnlocked) {
        router.push('/dashboard')
        return
      }

      // If not yet unlocked, check if they have a pending booking to direct them to its payment page
      try {
        const userBookings = await queryCollection<Booking>(
          'bookings',
          'studentId',
          '==',
          cred.user.uid
        )
        const pendingBooking = userBookings.find((b) => b.paymentStatus === 'pending')
        if (pendingBooking) {
          router.push(
            `/available-labs/${pendingBooking.labId}/payment?desk=${pendingBooking.seatNumber}`
          )
          return
        }
      } catch {
        // Fallback to showing notice
      }

      setPendingPayment(true)
    } catch (err) {
      const message = friendlyFirebaseError(err)
      setServerError(message)
      toast.error(message)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6 flex justify-center">
        <Logo theme="light" />
      </div>

      <h1 className="mb-6 text-center text-2xl font-bold text-deep-blue">
        Welcome Back to the Lab 🔬
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          register={register('email')}
          error={errors.email?.message}
        />

        <Input
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Your password"
          required
          register={register('password')}
          error={errors.password?.message}
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="text-lg text-gray-400 hover:text-deep-blue"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          }
        />

        <div className="flex items-center justify-between text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-electric-blue hover:underline"
          >
            Forgot password?
          </Link>
          {whatsappNumber && (
            <button
              type="button"
              onClick={() => setShowForgotHelp((v) => !v)}
              className="text-xs text-gray-400 hover:text-deep-blue"
            >
              Need WhatsApp help?
            </button>
          )}
        </div>

        {showForgotHelp && (
          <p className="rounded-lab bg-blue-light px-4 py-3 text-sm text-deep-blue">
            No worries! Contact the admin via{' '}
            {whatsappNumber ? (
              <a
                href={getWhatsAppLink(
                  whatsappNumber,
                  'Hi! I forgot my Language Labs password. Can you help me reset it?'
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-electric-blue underline"
              >
                WhatsApp
              </a>
            ) : (
              'WhatsApp'
            )}{' '}
            and we&apos;ll help you reset it.
          </p>
        )}

        {pendingPayment && (
          <p className="rounded-lab bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Your seat booking is pending payment confirmation. Please send your
            payment receipt via{' '}
            {whatsappNumber ? (
              <a
                href={getWhatsAppLink(
                  whatsappNumber,
                  'Hi! Here is my payment receipt for my Language Labs seat booking.'
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                WhatsApp
              </a>
            ) : (
              'WhatsApp'
            )}
            .
          </p>
        )}

        {serverError && (
          <p className="rounded-lab bg-red-50 px-4 py-3 text-sm text-seat-reserved">
            {serverError}
          </p>
        )}

        <Button type="submit" size="lg" loading={isSubmitting}>
          Login
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        New here?{' '}
        <Link
          href={
            targetRedirect
              ? `/register?redirect=${encodeURIComponent(targetRedirect)}`
              : '/register'
          }
          className="font-semibold text-electric-blue hover:underline"
        >
          Take the English test first
        </Link>
      </p>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" fullPage />}>
      <LoginContent />
    </Suspense>
  )
}
