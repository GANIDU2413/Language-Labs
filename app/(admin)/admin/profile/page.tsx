'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FirebaseError } from 'firebase/app'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { uploadFileWithProgress } from '@/lib/storage'
import { textareaClass } from '@/components/admin/QuestionForms'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { toast } from '@/hooks/useToast'
import { formatName } from '@/lib/utils'
import type { MentorProfile } from '@/types'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  introduction: z.string().min(10, 'Write a short introduction'),
  qualifications: z.string().min(2, 'Add at least one qualification'),
  teachingStyle: z.string().min(10, 'Describe your teaching style'),
  whyCreated: z.string().min(10, 'Tell students why you created Language Labs'),
})
type ProfileForm = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
type PasswordForm = z.infer<typeof passwordSchema>

// ---------------------------------------------------------------------------

export default function AdminProfilePage() {
  const [loaded, setLoaded] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | undefined>()
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadPct, setUploadPct] = useState<number | null>(null)
  const [profileMessage, setProfileMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  // Live values for the preview
  const preview = watch()

  useEffect(() => {
    getDoc(doc(db, 'admins', 'profile'))
      .then((snap) => {
        if (snap.exists()) {
          const mentor = snap.data() as MentorProfile
          setPhotoUrl(mentor.photoUrl)
          reset({
            firstName: mentor.firstName,
            lastName: mentor.lastName,
            introduction: mentor.introduction,
            qualifications: mentor.qualifications.join(', '),
            teachingStyle: mentor.teachingStyle,
            whyCreated: mentor.whyCreated,
          })
        }
      })
      .finally(() => setLoaded(true))
  }, [reset])

  function choosePhoto(file: File | null) {
    setPhotoFile(file)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  async function saveProfile(data: ProfileForm) {
    setProfileMessage('')
    try {
      let url = photoUrl
      if (photoFile) {
        setUploadPct(0)
        url = await uploadFileWithProgress(
          photoFile,
          `mentor/profile-${Date.now()}-${photoFile.name}`,
          setUploadPct
        )
        setUploadPct(null)
        setPhotoUrl(url)
        setPhotoFile(null)
      }

      const mentor: MentorProfile = {
        firstName: formatName(data.firstName),
        lastName: formatName(data.lastName),
        ...(url ? { photoUrl: url } : {}),
        introduction: data.introduction.trim(),
        qualifications: data.qualifications
          .split(',')
          .map((q) => q.trim())
          .filter(Boolean),
        teachingStyle: data.teachingStyle.trim(),
        whyCreated: data.whyCreated.trim(),
      }
      await setDoc(doc(db, 'admins', 'profile'), mentor, { merge: true })
      toast.success('Profile saved — the homepage will show it within an hour.')
    } catch {
      setUploadPct(null)
      toast.error('Could not save the profile. Please try again.')
    }
  }

  async function changePassword(data: PasswordForm) {
    setPasswordMessage('')
    const user = auth.currentUser
    if (!user?.email) {
      setPasswordMessage('❌ You need to be logged in.')
      return
    }
    try {
      // Firebase requires a recent login before password changes
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(user.email, data.currentPassword)
      )
      await updatePassword(user, data.newPassword)
      passwordForm.reset()
      toast.success('Password updated.')
    } catch (err) {
      if (
        err instanceof FirebaseError &&
        (err.code === 'auth/invalid-credential' ||
          err.code === 'auth/wrong-password')
      ) {
        toast.error('Current password is incorrect.')
      } else {
        toast.error('Could not update the password. Please try again.')
      }
    }
  }

  if (!loaded) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const displayPhoto = photoPreview ?? photoUrl
  const qualificationList = (preview.qualifications ?? '')
    .split(',')
    .map((q) => q.trim())
    .filter(Boolean)

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-deep-blue">Profile ⚙️</h1>
      <p className="mt-1 text-sm text-gray-500">
        This is what students see in the “Meet Your Mentor” section.
      </p>

      <div className="mt-6 grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        {/* ------------------------------------------------------- Form */}
        <div className="flex flex-col gap-6">
          <Card>
            <form
              onSubmit={handleSubmit(saveProfile)}
              noValidate
              className="flex flex-col gap-4"
            >
              {/* Photo */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to change photo"
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-blue-light bg-blue-light"
                >
                  {displayPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayPhoto}
                      alt="Profile photo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-3xl">
                      👩‍🔬
                    </span>
                  )}
                </button>
                <div>
                  <p className="text-sm font-medium text-deep-blue">
                    Profile Picture
                  </p>
                  <p className="text-xs text-gray-400">
                    Click the photo to change it
                  </p>
                  {uploadPct !== null && (
                    <p className="mt-1 text-xs text-electric-blue">
                      Uploading… {uploadPct}%
                    </p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => choosePhoto(e.target.files?.[0] ?? null)}
                />
              </div>

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

              {(
                [
                  ['introduction', 'Friendly Introduction', 3],
                  ['qualifications', 'Qualifications (comma separated)', 2],
                  ['teachingStyle', 'Teaching Style', 3],
                  ['whyCreated', 'Why Language Labs was Created', 3],
                ] as const
              ).map(([field, label, rows]) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <label
                    htmlFor={field}
                    className="text-sm font-medium text-deep-blue"
                  >
                    {label} <span className="text-seat-reserved">*</span>
                  </label>
                  <textarea
                    id={field}
                    rows={rows}
                    {...register(field)}
                    className={textareaClass}
                  />
                  {errors[field] && (
                    <p className="text-sm text-seat-reserved">
                      {errors[field]?.message}
                    </p>
                  )}
                </div>
              ))}

              {profileMessage && (
                <p className="rounded-lab bg-blue-light px-4 py-3 text-sm text-deep-blue">
                  {profileMessage}
                </p>
              )}

              <Button type="submit" size="lg" loading={isSubmitting}>
                Save Profile
              </Button>
            </form>
          </Card>

          {/* Password change — separate form + save */}
          <Card>
            <h2 className="font-bold text-deep-blue">Change Password 🔐</h2>
            <form
              onSubmit={passwordForm.handleSubmit(changePassword)}
              noValidate
              className="mt-4 flex flex-col gap-4"
            >
              <Input
                label="Current Password"
                name="currentPassword"
                type="password"
                required
                register={passwordForm.register('currentPassword')}
                error={passwordForm.formState.errors.currentPassword?.message}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="New Password"
                  name="newPassword"
                  type="password"
                  required
                  register={passwordForm.register('newPassword')}
                  error={passwordForm.formState.errors.newPassword?.message}
                />
                <Input
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  required
                  register={passwordForm.register('confirmPassword')}
                  error={passwordForm.formState.errors.confirmPassword?.message}
                />
              </div>
              {passwordMessage && (
                <p className="rounded-lab bg-blue-light px-4 py-3 text-sm text-deep-blue">
                  {passwordMessage}
                </p>
              )}
              <Button
                type="submit"
                variant="secondary"
                loading={passwordForm.formState.isSubmitting}
              >
                Update Password
              </Button>
            </form>
          </Card>
        </div>

        {/* ------------------------------------------------------ Preview */}
        <div className="lg:sticky lg:top-6">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Live homepage preview
          </p>
          <Card>
            <h2 className="text-center text-xl font-bold text-deep-blue">
              Meet Your Mentor
            </h2>
            <div className="mt-6 flex flex-col items-center text-center">
              <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-blue-light bg-blue-light">
                {displayPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayPhoto}
                    alt="Mentor"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-4xl">
                    👩‍🔬
                  </span>
                )}
              </div>
              <h3 className="mt-3 font-bold text-deep-blue">
                {preview.firstName || 'Your'} {preview.lastName || 'Name'}
              </h3>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {qualificationList.length ? (
                  qualificationList.map((q) => (
                    <Badge key={q} variant="info">
                      {q}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="info">Your qualifications</Badge>
                )}
              </div>
            </div>

            <p className="mt-5 text-sm text-gray-600">
              {preview.introduction || 'Your friendly introduction appears here…'}
            </p>
            <div className="mt-4 rounded-lab border-l-4 border-deep-blue bg-blue-light/50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-deep-blue">
                How I Teach
              </h4>
              <p className="mt-1 text-sm text-gray-600">
                {preview.teachingStyle || 'Your teaching style appears here…'}
              </p>
            </div>
            <div className="mt-3 rounded-lab border-l-4 border-electric-blue bg-blue-light/50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-deep-blue">
                Why Language Labs Was Created
              </h4>
              <p className="mt-1 text-sm text-gray-600">
                {preview.whyCreated || 'Your story appears here…'}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
