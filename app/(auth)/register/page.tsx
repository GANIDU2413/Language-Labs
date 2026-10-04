'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { formatFullName, friendlyFirebaseError } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import Logo from '@/components/layout/Logo'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const registerSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.email('Enter a valid email address'),
    phone: z
      .string()
      .regex(
        /^(?:\+94|0)7\d{8}$/,
        'Enter a valid Sri Lankan mobile number (e.g. 0771234567)'
      ),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterForm = z.infer<typeof registerSchema>

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const toast = useToast()
  const [serverError, setServerError] = useState('')

  const storedRedirect =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('ll_intended_payment')
      : null
  const targetRedirect = redirectParam || storedRedirect
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  async function onSubmit(data: RegisterForm) {
    setServerError('')
    try {
      const email = data.email.toLowerCase()
      const formatted = formatFullName(data.firstName, data.lastName)
      const cred = await createUserWithEmailAndPassword(
        auth,
        email,
        data.password
      )

      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        firstName: formatted.firstName,
        lastName: formatted.lastName,
        fullName: formatted.fullName,
        email,
        phone: data.phone,
        role: 'student',
        status: 'pending',
        emailVerified: false,
        dashboardUnlocked: false,
        createdAt: Timestamp.now(),
      })

      const otpRes = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName: formatted.firstName }),
      })

      if (!otpRes.ok) {
        const otpData = await otpRes.json().catch(() => null)
        const msg = otpData?.error || 'Account created, but could not send verification email.'
        toast.error(msg)
      }

      const verifyUrl = targetRedirect
        ? `/verify-otp?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(targetRedirect)}`
        : `/verify-otp?email=${encodeURIComponent(email)}`
      router.push(verifyUrl)
    } catch (err) {
      const message = friendlyFirebaseError(err)
      setServerError(message)
      toast.error(message)
    }
  }

  return (
    <Card className="w-full max-w-md">
      {/* Logo */}
      <div className="mb-6 flex justify-center">
        <Logo theme="light" />
      </div>

      <h1 className="text-center text-2xl font-bold text-deep-blue">
        Create Your Lab Account
      </h1>
      <p className="mb-6 mt-1 text-center text-sm text-gray-500">
        Start your English learning journey
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="First Name"
            name="firstName"
            placeholder="Amaya"
            required
            register={register('firstName')}
            error={errors.firstName?.message}
          />
          <Input
            label="Last Name"
            name="lastName"
            placeholder="Perera"
            required
            register={register('lastName')}
            error={errors.lastName?.message}
          />
        </div>

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
          label="Mobile Number"
          name="phone"
          type="tel"
          placeholder="0771234567"
          required
          register={register('phone')}
          error={errors.phone?.message}
        />

        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          required
          register={register('password')}
          error={errors.password?.message}
        />

        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          placeholder="Repeat your password"
          required
          register={register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />

        {serverError && (
          <p className="rounded-lab bg-red-50 px-4 py-3 text-sm text-seat-reserved">
            {serverError}
          </p>
        )}

        <Button type="submit" size="lg" loading={isSubmitting} className="mt-2">
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link
          href={
            targetRedirect
              ? `/login?redirect=${encodeURIComponent(targetRedirect)}`
              : '/login'
          }
          className="font-semibold text-electric-blue hover:underline"
        >
          Login
        </Link>
      </p>
    </Card>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" fullPage />}>
      <RegisterContent />
    </Suspense>
  )
}
