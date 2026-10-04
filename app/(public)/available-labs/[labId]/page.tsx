'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatDate } from '@/lib/utils'
import SeatPicker from '@/components/lab/SeatPicker'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import type { Lab } from '@/types'

const courseTopics = [
  'Vocabulary',
  'Grammar',
  'Pronunciation',
  'Listening',
  'Speaking',
  'Day-to-Day English',
  'Interview Preparation',
  'Overall Fluency',
]

const URGENCY_MINUTES = 15

export default function LabDetailPage() {
  const { labId } = useParams<{ labId: string }>()
  const router = useRouter()
  const { firebaseUser } = useAuth()

  const [lab, setLab] = useState<Lab | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [selectedDesk, setSelectedDesk] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(URGENCY_MINUTES * 60)
  const confirmRef = useRef<HTMLDivElement | null>(null)

  const handleProceedToPayment = () => {
    if (selectedDesk === null) return
    const paymentUrl = `/available-labs/${labId}/payment?desk=${selectedDesk}`
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ll_intended_payment', paymentUrl)
    }
    if (!firebaseUser) {
      router.push(`/login?redirect=${encodeURIComponent(paymentUrl)}`)
    } else {
      router.push(paymentUrl)
    }
  }

  // Live lab details (seats remaining counter updates in real time)
  useEffect(() => {
    if (!labId) return
    const unsubscribe = onSnapshot(
      doc(db, 'labs', labId),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true)
          return
        }
        setLab({ id: snap.id, ...snap.data() } as Lab)
      },
      () => setNotFound(true)
    )
    return unsubscribe
  }, [labId])

  // Urgency countdown — display only, does not hold a seat
  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [secondsLeft])

  // Bring the confirmation card into view once a desk is confirmed
  useEffect(() => {
    if (selectedDesk !== null) {
      confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedDesk])

  if (notFound) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-600">This lab could not be found.</p>
        <Button onClick={() => router.push('/available-labs')}>
          ← Back to Available Labs
        </Button>
      </div>
    )
  }

  if (!lab) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const seatsLeft = lab.seats?.filter((s) => s.status === 'available').length ?? 0
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Urgency banner */}
      <div className="flex flex-col items-center justify-between gap-2 rounded-lab bg-deep-blue px-5 py-4 text-center sm:flex-row sm:text-left">
        <p className="text-sm font-medium text-lab-white">
          ⏳ Book your seat before others take it — seats are limited
        </p>
        <p className="font-mono text-lg font-bold text-electric-blue">
          {secondsLeft > 0
            ? `${minutes}:${seconds.toString().padStart(2, '0')}`
            : 'Seats may be going fast!'}
        </p>
      </div>

      {/* Lab details */}
      <Card className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-deep-blue">{lab.name}</h1>
          <Badge variant={lab.status === 'ongoing' ? 'success' : 'info'}>
            {lab.status === 'ongoing' ? 'Ongoing' : 'Not Started'}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-2">
          <p>📅 Starts {formatDate(lab.startDate.toDate())}</p>
          <p>🕕 {lab.schedule}</p>
          <p>
            ⏱️ {lab.totalSessions} sessions over{' '}
            {Math.ceil(lab.totalSessions / 2)} weeks — twice a week
          </p>
          <p className="font-semibold text-deep-blue">
            💺 {seatsLeft} / 6 seats remaining
          </p>
        </div>

        <h2 className="mt-6 font-semibold text-deep-blue">
          What&apos;s covered in this lab
        </h2>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {courseTopics.map((topic) => (
            <li key={topic} className="text-sm text-gray-600">
              ✅ {topic}
            </li>
          ))}
        </ul>
      </Card>

      {/* Seat picker */}
      <h2 className="mt-10 text-center text-xl font-bold text-deep-blue">
        Pick Your Desk
      </h2>
      <div className="mt-6">
        <SeatPicker labId={labId} onSeatSelected={setSelectedDesk} />
      </div>

      {/* Proceed to payment */}
      <div ref={confirmRef}>
        <AnimatePresence>
          {selectedDesk !== null && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="mt-8 border-2 border-electric-blue text-center">
                <p className="text-3xl">🎉</p>
                <h3 className="mt-2 text-lg font-bold text-deep-blue">
                  Desk {selectedDesk} is yours to claim!
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Complete the payment to lock in your seat at {lab.name}.
                </p>
                <Button
                  size="lg"
                  className="mt-5"
                  onClick={handleProceedToPayment}
                >
                  Proceed to Payment →
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
