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

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const profileDetailsSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z
    .string()
    .regex(
      /^(?:\+94|0)7\d{8}$/,
      'Enter a valid Sri Lankan mobile number (e.g. 0771234567)'
    ),
})

type ProfileDetailsForm = z.infer<typeof profileDetailsSchema>

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type PasswordForm = z.infer<typeof passwordSchema>

// ---------------------------------------------------------------------------

export default function StudentProfilePage() {
  const { user, firebaseUser } = useAuth()
  const [lab, setLab] = useState<Lab | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [profileMessage, setProfileMessage] = useState<{
    ok: boolean
    text: string
  } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{
    ok: boolean
    text: string
  } | null>(null)

  // Form 1: Profile Details
  const profileForm = useForm<ProfileDetailsForm>({
    resolver: zodResolver(profileDetailsSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
    },
  })

  // Form 2: Password Change
  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  // Prefill profile details once the user is loaded
  useEffect(() => {
    if (!user) return
    profileForm.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    })
  }, [user, profileForm])

  // Enrolled lab info (read only)
  const enrolledLabId = user?.enrolledLabId
  useEffect(() => {
    if (!enrolledLabId || !firebaseUser) return
    Promise.all([
      getDocument<Lab>('labs', enrolledLabId),
      queryCollection<Booking>('bookings', 'studentId', '==', firebaseUser.uid),
    ]).then(([labDoc, bookings]) => {
      setLab(labDoc)
      setBooking(
        bookings.find(
          (b) =>
            b.labId === enrolledLabId && b.paymentStatus === 'confirmed'
        ) ?? null
      )
    })
  }, [enrolledLabId, firebaseUser])

  // Form 1 Submit: Update Profile Details without requiring password
  async function onUpdateProfile(data: ProfileDetailsForm) {
    setProfileMessage(null)
    const authUser = auth.currentUser
    if (!authUser || !firebaseUser) {
      setProfileMessage({ ok: false, text: 'You need to be logged in.' })
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

      profileForm.reset({
        firstName: formatted.firstName,
        lastName: formatted.lastName,
        phone: data.phone,
      })
      setProfileMessage({
        ok: true,
        text: 'Personal details updated successfully.',
      })
      toast.success('Profile updated successfully.')
    } catch {
      setProfileMessage({
        ok: false,
        text: 'Could not save your changes. Please try again.',
      })
      toast.error('Could not save your changes. Please try again.')
    }
  }

  // Form 2 Submit: Change Password with reauthentication
  async function onChangePassword(data: PasswordForm) {
    setPasswordMessage(null)
    const authUser = auth.currentUser
    if (!authUser?.email || !firebaseUser) {
      setPasswordMessage({ ok: false, text: 'You need to be logged in.' })
      return
    }

    try {
      // Re-authenticate before changing password
      await reauthenticateWithCredential(
        authUser,
        EmailAuthProvider.credential(authUser.email, data.currentPassword)
      )
    } catch (err) {
      const isInvalidCred =
        err instanceof FirebaseError &&
        (err.code === 'auth/invalid-credential' ||
          err.code === 'auth/wrong-password')
      const msg = isInvalidCred
        ? 'Current password is incorrect.'
        : 'Could not verify your password. Please try again.'
      setPasswordMessage({ ok: false, text: msg })
      toast.error(msg)
      return
    }

    try {
      await updatePassword(authUser, data.newPassword)
      passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setPasswordMessage({
        ok: true,
        text: 'Password updated successfully.',
      })
      toast.success('Password updated successfully.')
    } catch (err) {
      const msg =
        err instanceof FirebaseError && err.code === 'auth/requires-recent-login'
          ? 'Please log in again before changing your password.'
          : 'Could not update your password. Please try again.'
      setPasswordMessage({ ok: false, text: msg })
      toast.error(msg)
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
        Manage your personal information and account security.
      </p>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* Left Column: Form 1 (Profile Details) & Form 2 (Password Change) */}
        <div className="flex flex-col gap-6">
          {/* Form 1: Personal Details */}
          <Card>
            <div className="mb-4 border-b border-blue-light pb-3">
              <h2 className="text-lg font-bold text-deep-blue">
                Personal Details 👤
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Update your name and WhatsApp contact number.
              </p>
            </div>

            <form
              onSubmit={profileForm.handleSubmit(onUpdateProfile)}
              noValidate
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="First Name"
                  name="firstName"
                  required
                  register={profileForm.register('firstName')}
                  error={profileForm.formState.errors.firstName?.message}
                />
                <Input
                  label="Last Name"
                  name="lastName"
                  required
                  register={profileForm.register('lastName')}
                  error={profileForm.formState.errors.lastName?.message}
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
                register={profileForm.register('phone')}
                error={profileForm.formState.errors.phone?.message}
              />

              {profileMessage && (
                <p
                  className={`rounded-lab px-4 py-3 text-sm ${
                    profileMessage.ok
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-seat-reserved'
                  }`}
                >
                  {profileMessage.text}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                loading={profileForm.formState.isSubmitting}
              >
                Save Details
              </Button>
            </form>
          </Card>

          {/* Form 2: Password Change */}
          <Card>
            <div className="mb-4 border-b border-blue-light pb-3">
              <h2 className="text-lg font-bold text-deep-blue">
                Change Password 🔐
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Ensure your account is using a secure password.
              </p>
            </div>

            <form
              onSubmit={passwordForm.handleSubmit(onChangePassword)}
              noValidate
              className="flex flex-col gap-4"
            >
              <Input
                label="Current Password"
                name="currentPassword"
                type="password"
                placeholder="Enter current password"
                required
                register={passwordForm.register('currentPassword')}
                error={passwordForm.formState.errors.currentPassword?.message}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="New Password"
                  name="newPassword"
                  type="password"
                  placeholder="Min. 8 characters"
                  required
                  register={passwordForm.register('newPassword')}
                  error={passwordForm.formState.errors.newPassword?.message}
                />
                <Input
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  required
                  register={passwordForm.register('confirmPassword')}
                  error={passwordForm.formState.errors.confirmPassword?.message}
                />
              </div>

              {passwordMessage && (
                <p
                  className={`rounded-lab px-4 py-3 text-sm ${
                    passwordMessage.ok
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-seat-reserved'
                  }`}
                >
                  {passwordMessage.text}
                </p>
              )}

              <Button
                type="submit"
                variant="secondary"
                size="lg"
                loading={passwordForm.formState.isSubmitting}
              >
                Update Password
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Enrolled lab (read only) */}
        <div className="flex flex-col gap-6">
          <Card>
            <div className="mb-4 border-b border-blue-light pb-3">
              <h2 className="text-lg font-bold text-deep-blue">Your Lab 🧪</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Enrolment details — contact us via WhatsApp to change anything here.
              </p>
            </div>
            {lab ? (
              <dl className="flex flex-col gap-3 text-sm">
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
              <p className="text-sm text-gray-400">
                No lab enrolment found.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
