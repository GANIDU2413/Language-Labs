'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Timestamp } from 'firebase/firestore'
import { addDocument, getCollection, queryCollection } from '@/lib/firestore'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import ErrorState from '@/components/ui/ErrorState'
import { CardGridSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/hooks/useToast'
import type { Lab, WaitingListEntry } from '@/types'

const WAITING_LIST_LIMIT = 12
const TOTAL_SEATS = 6

const waitingListSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('Enter a valid email address'),
  phone: z
    .string()
    .regex(
      /^(?:\+94|0)7\d{8}$/,
      'Enter a valid Sri Lankan WhatsApp number (e.g. 0771234567)'
    ),
})

type WaitingListForm = z.infer<typeof waitingListSchema>

function seatsAvailable(lab: Lab): number {
  if (!lab.seats?.length) return TOTAL_SEATS
  return lab.seats.filter((seat) => seat.status === 'available').length
}

export default function AvailableLabsPage() {
  const toast = useToast()
  const [labs, setLabs] = useState<Lab[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [waitingCount, setWaitingCount] = useState(0)
  const [joined, setJoined] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WaitingListForm>({ resolver: zodResolver(waitingListSchema) })

  function loadData() {
    setLoading(true)
    setFetchError(false)
    Promise.all([
      getCollection<Lab>('labs'),
      getCollection<WaitingListEntry>('waitingList'),
    ])
      .then(([allLabs, waitingList]) => {
        setLabs(
          allLabs.filter(
            (lab) => lab.status === 'notStarted' || lab.status === 'ongoing'
          )
        )
        setWaitingCount(waitingList.length)
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }

  useEffect(loadData, [])

  async function joinWaitingList(data: WaitingListForm) {
    setServerError('')
    try {
      const email = data.email.toLowerCase()

      // Fresh capacity + duplicate check at submit time
      const [entries, existing] = await Promise.all([
        getCollection<WaitingListEntry>('waitingList'),
        queryCollection<WaitingListEntry>('waitingList', 'email', '==', email),
      ])
      if (existing.length > 0) {
        setServerError("You're already on the waiting list — we'll be in touch!")
        return
      }
      if (entries.length >= WAITING_LIST_LIMIT) {
        setWaitingCount(entries.length)
        return
      }

      await addDocument<WaitingListEntry>('waitingList', {
        fullName: data.fullName.trim(),
        email,
        phone: data.phone,
        notified: false,
        joinedAt: Timestamp.now(),
      })
      setJoined(true)
      toast.success("You're on the waiting list! We'll email you soon.")
    } catch {
      setServerError('Something went wrong. Please try again.')
      toast.error('Could not join the waiting list. Please try again.')
    }
  }

  const listFull = waitingCount >= WAITING_LIST_LIMIT

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-center text-3xl font-bold text-deep-blue sm:text-4xl">
        Available Labs
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-gray-500">
        Pick a lab batch and grab one of the 6 desks before they fill up.
      </p>

      {loading ? (
        <div className="mt-12">
          <CardGridSkeleton count={3} cardClassName="h-72" />
        </div>
      ) : fetchError ? (
        <ErrorState onRetry={loadData} />
      ) : labs.length === 0 ? (
        <p className="mt-12 text-center text-lg text-gray-600">
          No labs are currently open 😔 — join the waiting list below and
          we&apos;ll email you the moment a new lab opens!
        </p>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {labs.map((lab) => {
            const available = seatsAvailable(lab)
            const isFull = available === 0
            return (
              <Card key={lab.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold text-deep-blue">
                    {lab.name}
                  </h2>
                  <Badge variant={lab.status === 'ongoing' ? 'success' : 'info'}>
                    {lab.status === 'ongoing' ? 'Ongoing' : 'Not Started'}
                  </Badge>
                </div>

                <p className="mt-3 text-sm text-gray-600">
                  📅 Starts {formatDate(lab.startDate.toDate())}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  ⏱️ {Math.ceil(lab.totalSessions / 2)} Weeks — Twice a Week
                </p>
                {lab.schedule && (
                  <p className="mt-1 text-sm text-gray-600">🕕 {lab.schedule}</p>
                )}

                {/* Seats remaining */}
                <div className="mt-4">
                  <p className="text-sm font-semibold text-deep-blue">
                    💺 {available} / {TOTAL_SEATS} Seats Available
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-light">
                    <div
                      className={`h-full rounded-full ${
                        isFull ? 'bg-seat-reserved' : 'bg-electric-blue'
                      }`}
                      style={{
                        width: `${((TOTAL_SEATS - available) / TOTAL_SEATS) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-6 flex-1" />
                {isFull ? (
                  <a href="#waiting-list" className="block">
                    <Button variant="secondary" className="w-full">
                      Full — Join Waiting List
                    </Button>
                  </a>
                ) : (
                  <Link href={`/available-labs/${lab.id}`} className="block">
                    <Button className="w-full">Select This Lab</Button>
                  </Link>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Waiting list */}
      <section id="waiting-list" className="mx-auto mt-16 max-w-md">
        <Card>
          <h2 className="text-center text-xl font-bold text-deep-blue">
            Join the Waiting List 📋
          </h2>

          {joined ? (
            <p className="mt-4 rounded-lab bg-green-50 px-4 py-3 text-center text-sm text-green-700">
              🎉 You&apos;re on the list! We&apos;ll email you as soon as a new
              lab opens.
            </p>
          ) : listFull ? (
            <p className="mt-4 rounded-lab bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
              The waiting list is full right now — please check back soon!
            </p>
          ) : (
            <>
              <p className="mt-2 text-center text-sm text-gray-500">
                Be the first to know when a seat opens up.
              </p>
              <form
                onSubmit={handleSubmit(joinWaitingList)}
                noValidate
                className="mt-6 flex flex-col gap-4"
              >
                <Input
                  label="Full Name"
                  name="fullName"
                  placeholder="Amaya Perera"
                  required
                  register={register('fullName')}
                  error={errors.fullName?.message}
                />
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
                  label="WhatsApp Number"
                  name="phone"
                  type="tel"
                  placeholder="0771234567"
                  required
                  register={register('phone')}
                  error={errors.phone?.message}
                />

                {serverError && (
                  <p className="rounded-lab bg-red-50 px-4 py-3 text-sm text-seat-reserved">
                    {serverError}
                  </p>
                )}

                <Button type="submit" loading={isSubmitting}>
                  Join Waiting List
                </Button>
              </form>
            </>
          )}
        </Card>
      </section>
    </div>
  )
}
