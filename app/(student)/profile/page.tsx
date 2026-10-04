'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FirebaseError } from 'firebase/app'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getDocument, queryCollection, updateDocument } from '@/lib/firestore'
import { formatDate, formatFullName } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { toast } from '@/hooks/useToast'
import type { Booking, Lab, User } from '@/types'

const profileSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    phone: z
      .string()
      .regex(
        /^(?:\+94|0)7\d{8}$/,
        'Enter a valid Sri Lankan mobile number (e.g. 0771234567)'
      ),
    currentPassword: z.string().min(1, 'Current password is required to save'),
    newPassword: z.string().optional(),
    confirmNewPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword) {
      if (data.newPassword.length < 8) {
        ctx.addIssue({
          code: 'custom',
          path: ['newPassword'],
          message: 'New password must be at least 8 characters',
        })
      }
      if (data.newPassword !== data.confirmNewPassword) {
        ctx.addIssue({
          code: 'custom',
          path: ['confirmNewPassword'],
          message: 'Passwords do not match',
        })
      }
    }
  })

type ProfileForm = z.infer<typeof profileSchema>

export default function StudentProfilePage() {
  const { user, firebaseUser } = useAuth()
  const [lab, setLab] = useState<Lab | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) })

  // Prefill once the profile is loaded
  useEffect(() => {
    if (!user) return
    reset({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    })
  }, [user, reset])

  // Enrolled lab info (read only)
  useEffect(() => {
    if (!user?.enrolledLabId || !firebaseUser) return
    Promise.all([
      getDocument<Lab>('labs', user.enrolledLabId),
      queryCollection<Booking>('bookings', 'studentId', '==', firebaseUser.uid),
    ]).then(([labDoc, bookings]) => {
      setLab(labDoc)
      setBooking(
        bookings.find(
          (b) =>
            b.labId === user.enrolledLabId && b.paymentStatus === 'confirmed'
        ) ?? null
      )
    })
  }, [user, firebaseUser])

  async function onSubmit(data: ProfileForm) {
    setMessage(null)
    const authUser = auth.currentUser
    if (!authUser?.email || !firebaseUser) {
      setMessage({ ok: false, text: 'You need to be logged in.' })
      return
    }

    try {
      // Current password gates every save (and freshens the session
      // in case a password change follows)
      await reauthenticateWithCredential(
        authUser,
        EmailAuthProvider.credential(authUser.email, data.currentPassword)
      )
    } catch (err) {
      setMessage({
        ok: false,
        text:
          err instanceof FirebaseError &&
          (err.code === 'auth/invalid-credential' ||
            err.code === 'auth/wrong-password')
            ? 'Current password is incorrect'
            : 'Could not verify your password. Please try again.',
      })
      return
    }

    try {
      const formatted = formatFullName(data.firstName, data.lastName)
      await updateDocument<User>('users', firebaseUser.uid, {
        firstName: formatted.firstName,
        lastName: formatted.lastName,
        fullName: formatted.fullName,
        phone: data.phone,
      })

      // Sync studentName in any existing bookings for this student
      try {
        const studentBookings = await queryCollection<Booking>(
          'bookings',
          'studentId',
          '==',
          firebaseUser.uid
        )
        for (const b of studentBookings) {
          if (b.studentName !== formatted.fullName) {
            await updateDocument('bookings', b.id, {
              studentName: formatted.fullName,
            })
          }
        }
      } catch {
        // Non-blocking sync
      }

      if (data.newPassword) {
        await updatePassword(authUser, data.newPassword)
      }

      reset({
        firstName: formatted.firstName,
        lastName: formatted.lastName,
        phone: data.phone,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      })
      toast.success(
        data.newPassword ? 'Profile and password updated.' : 'Profile updated.'
      )
    } catch {
      toast.error('Could not save your changes. Please try again.')
    }
  }

  if (!user) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-deep-blue">Profile 👤</h1>
      <p className="mt-1 text-sm text-gray-500">
        Keep your details up to date.
      </p>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* Editable details */}
        <Card>
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="First Name"
                name="firstName"
                required
                register={register('firstName')}
                error={errors.firstName?.message}
              />
              <Input
                label="Last Name"
                name="lastName"
                required
                register={register('lastName')}
                error={errors.lastName?.message}
              />
            </div>

            <Input
              label="Email (cannot be changed)"
              name="email"
              type="email"
              value={user.email}
              disabled
              className="bg-gray-50 text-gray-400"
            />

            <Input
              label="WhatsApp Number"
              name="phone"
              type="tel"
              required
              register={register('phone')}
              error={errors.phone?.message}
            />

            <hr className="border-blue-light" />

            <Input
              label="Current Password (required to save changes)"
              name="currentPassword"
              type="password"
              required
              register={register('currentPassword')}
              error={errors.currentPassword?.message}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="New Password (optional)"
                name="newPassword"
                type="password"
                placeholder="Leave empty to keep current"
                register={register('newPassword')}
                error={errors.newPassword?.message}
              />
              <Input
                label="Confirm New Password"
                name="confirmNewPassword"
                type="password"
                register={register('confirmNewPassword')}
                error={errors.confirmNewPassword?.message}
              />
            </div>

            {message && (
              <p
                className={`rounded-lab px-4 py-3 text-sm ${
                  message.ok
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-seat-reserved'
                }`}
              >
                {message.text}
              </p>
            )}

            <Button type="submit" size="lg" loading={isSubmitting}>
              Save Changes
            </Button>
          </form>
        </Card>

        {/* Enrolled lab (read only) */}
        <Card>
          <h2 className="font-bold text-deep-blue">Your Lab 🧪</h2>
          <p className="mt-1 text-xs text-gray-400">
            Enrolment details — contact us via WhatsApp to change anything here.
          </p>
          {lab ? (
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <div className="flex justify-between border-b border-blue-light pb-2">
                <dt className="text-gray-500">Lab</dt>
                <dd className="font-semibold text-deep-blue">{lab.name}</dd>
              </div>
              <div className="flex justify-between border-b border-blue-light pb-2">
                <dt className="text-gray-500">Desk</dt>
                <dd>
                  <Badge variant="info">
                    💺 Desk {booking?.seatNumber ?? '—'}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between border-b border-blue-light pb-2">
                <dt className="text-gray-500">Start date</dt>
                <dd className="font-semibold text-deep-blue">
                  {formatDate(lab.startDate.toDate())}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Schedule</dt>
                <dd className="text-right font-semibold text-deep-blue">
                  {lab.schedule}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-gray-400">
              No lab enrolment found.
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
