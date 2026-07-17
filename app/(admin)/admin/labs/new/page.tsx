'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Timestamp } from 'firebase/firestore'
import { addDocument, getCollection, updateDocument } from '@/lib/firestore'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { toast } from '@/hooks/useToast'
import type { Lab, Seat, WaitingListEntry } from '@/types'

const newLabSchema = z.object({
  labName: z.string().min(2, 'Lab name must be at least 2 characters'),
  duration: z.string().min(2, 'Duration is required'),
  startDate: z.string().refine((v) => v && !Number.isNaN(Date.parse(v)), {
    message: 'Pick a valid start date',
  }),
  schedule: z.string().min(2, 'Schedule is required'),
  fee: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z.coerce.number().positive('Fee must be a positive number').optional()
  ),
})

// Input (raw form values) and output (after zod coercion) differ because of fee
type NewLabInput = z.input<typeof newLabSchema>
type NewLabForm = z.output<typeof newLabSchema>

const emptySeats: Seat[] = Array.from({ length: 6 }, (_, i) => ({
  seatNumber: i + 1,
  status: 'available',
}))

function newLabEmailHtml(name: string, labName: string, link: string): string {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;background:#E6F1FB;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;">
    <div style="background:#0A1628;padding:24px;text-align:center;">
      <span style="font-size:20px;font-weight:bold;color:#FFFFFF;">🧪 Language <span style="color:#1E90FF;">Labs</span></span>
    </div>
    <div style="padding:28px;color:#0A1628;font-size:15px;line-height:1.6;">
      <p>Hi ${name},</p>
      <p>You're on our waiting list and a new lab just opened —
      <strong>${labName}</strong>! Seats are limited to 6 — click below to
      secure yours before they're gone!</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${link}" style="background:#1E90FF;color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:bold;">Secure My Seat</a>
      </p>
      <p style="font-size:13px;color:#6B7280;">You received this because you joined the Language Labs waiting list.</p>
    </div>
  </div>
</div>`
}

export default function NewLabPage() {
  const [created, setCreated] = useState<{ name: string; notified: number } | null>(null)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewLabInput, unknown, NewLabForm>({
    resolver: zodResolver(newLabSchema),
  })

  async function onSubmit(data: NewLabForm) {
    setServerError('')
    try {
      await addDocument<Lab>('labs', {
        name: data.labName.trim(),
        duration: data.duration.trim(),
        startDate: Timestamp.fromDate(new Date(data.startDate)),
        schedule: data.schedule.trim(),
        totalSessions: 16,
        currentWeek: 1,
        seats: emptySeats,
        status: 'notStarted',
        ...(data.fee !== undefined ? { fee: data.fee } : {}),
        createdAt: Timestamp.now(),
      })

      // Email everyone on the waiting list
      let notified = 0
      try {
        const waitingList = await getCollection<WaitingListEntry>('waitingList')
        const link = `${window.location.origin}/available-labs`
        const results = await Promise.allSettled(
          waitingList.map((entry) =>
            fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: entry.email,
                subject: 'Great news! A new Language Lab just opened 🔬',
                html: newLabEmailHtml(
                  entry.fullName,
                  data.labName.trim(),
                  link
                ),
              }),
            }).then((res) => {
              if (!res.ok) throw new Error('send failed')
              return updateDocument<WaitingListEntry>(
                'waitingList',
                entry.id,
                { notified: true }
              )
            })
          )
        )
        notified = results.filter((r) => r.status === 'fulfilled').length
      } catch {
        // Lab is created either way — email failures are reported via count
      }

      setCreated({ name: data.labName.trim(), notified })
      reset()
    } catch {
      setServerError('Could not create the lab. Please try again.')
      toast.error('Could not create the lab. Please try again.')
    }
  }

  if (created) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <Card className="text-center">
          <p className="text-4xl">🎉</p>
          <h1 className="mt-3 text-xl font-bold text-deep-blue">
            {created.name} is open for booking!
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {created.notified > 0
              ? `${created.notified} waiting-list student${created.notified === 1 ? ' was' : 's were'} notified by email.`
              : 'No waiting-list students to notify.'}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/admin/labs?tab=notStarted">
              <Button className="w-full">View the Lab</Button>
            </Link>
            <Button variant="secondary" onClick={() => setCreated(null)}>
              Create Another Lab
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold text-deep-blue">New Lab Creation ➕</h1>
      <p className="mt-1 text-sm text-gray-500">
        Every lab opens with 6 empty desks, 16 sessions, week 1.
      </p>

      <Card className="mt-6">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <Input
            label="Lab Name"
            name="labName"
            placeholder="LanguageLab1"
            required
            register={register('labName')}
            error={errors.labName?.message}
          />
          <Input
            label="Time Duration"
            name="duration"
            placeholder="8 Weeks — Twice a Week — 16 Sessions"
            required
            register={register('duration')}
            error={errors.duration?.message}
          />
          <Input
            label="Start Date"
            name="startDate"
            type="date"
            required
            register={register('startDate')}
            error={errors.startDate?.message}
          />
          <Input
            label="Class Schedule"
            name="schedule"
            placeholder="Tuesdays and Thursdays, 6:00 PM — 7:30 PM"
            required
            register={register('schedule')}
            error={errors.schedule?.message}
          />
          <Input
            label="Lab Fee (Rs.)"
            name="fee"
            type="number"
            placeholder="15000"
            register={register('fee')}
            error={errors.fee?.message}
          />

          {serverError && (
            <p className="rounded-lab bg-red-50 px-4 py-3 text-sm text-seat-reserved">
              {serverError}
            </p>
          )}

          <Button type="submit" size="lg" loading={isSubmitting}>
            Create Lab & Notify Waiting List
          </Button>
        </form>
      </Card>
    </div>
  )
}
