'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { friendlyFirebaseError } from '@/lib/utils'
import { setAuthCookie } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import Logo from '@/components/layout/Logo'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import type { User } from '@/types'

const adminLoginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type AdminLoginForm = z.infer<typeof adminLoginSchema>

export default function AdminLoginPage() {
  const router = useRouter()
  const toast = useToast()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginForm>({ resolver: zodResolver(adminLoginSchema) })

  async function onSubmit(data: AdminLoginForm) {
    setServerError('')
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        data.email.toLowerCase(),
        data.password
      )

      const snap = await getDoc(doc(db, 'users', cred.user.uid))
      const profile = snap.exists() ? (snap.data() as User) : null

      if (profile?.role !== 'admin') {
        await signOut(auth)
        setServerError('Access denied. Not an admin account.')
        toast.error('Access denied. Not an admin account.')
        return
      }

      setAuthCookie(profile)
      router.push('/admin')
    } catch (err) {
      const message = friendlyFirebaseError(
        err,
        'Email or password is incorrect.'
      )
      setServerError(message)
      toast.error(message)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-deep-blue px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-2 flex justify-center">
          <Logo theme="light" />
        </div>
        <h1 className="text-center text-sm font-semibold uppercase tracking-wide text-electric-blue">
          Admin Panel
        </h1>
        <p className="mb-6 mt-1 text-center text-sm text-gray-500">
          Authorised personnel only
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="admin@languagelabs.com"
            required
            register={register('email')}
            error={errors.email?.message}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Your password"
            required
            register={register('password')}
            error={errors.password?.message}
          />

          <div className="text-right">
            <Link
              href="/forgot-password?role=admin"
              className="text-xs font-semibold text-electric-blue hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {serverError && (
            <p className="rounded-lab bg-red-50 px-4 py-3 text-sm text-seat-reserved">
              {serverError}
            </p>
          )}

          <Button type="submit" size="lg" loading={isSubmitting}>
            Login
          </Button>
        </form>
      </Card>
    </div>
  )
}
