'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getWhatsAppLink } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { toast } from '@/hooks/useToast'
import type { BankDetails, Lab } from '@/types'

// Fallback until the admin saves real details to the admins/bank document
const fallbackBank: BankDetails = {
  accountName: 'Language Labs',
  accountNumber: '000-000-0000',
  bankName: 'Your Bank',
  branch: 'Main Branch',
}

function PaymentContent() {
  const { labId } = useParams<{ labId: string }>()
  const deskParam = useSearchParams().get('desk')
  const deskNumber = Number(deskParam)
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading } = useAuth()

  const [lab, setLab] = useState<Lab | null>(null)
  const [bank, setBank] = useState<BankDetails>(fallbackBank)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [booked, setBooked] = useState(false)
  const [error, setError] = useState('')

  // Students must be logged in so the booking has an owner
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      const currentUrl = `/available-labs/${labId}/payment${deskParam ? `?desk=${deskParam}` : ''}`
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('ll_intended_payment', currentUrl)
      }
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`)
    }
  }, [authLoading, firebaseUser, router, labId, deskParam])

  useEffect(() => {
    if (!labId) return
    Promise.all([
      getDoc(doc(db, 'labs', labId)),
      getDoc(doc(db, 'admins', 'bank')),
    ])
      .then(([labSnap, bankSnap]) => {
        if (labSnap.exists()) {
          const labData = { id: labSnap.id, ...labSnap.data() } as Lab
          setLab(labData)
          if (firebaseUser && deskNumber) {
            const mySeat = labData.seats?.find(
              (s) => s.seatNumber === deskNumber && s.studentId === firebaseUser.uid
            )
            if (mySeat) {
              setBooked(true)
            }
          }
        }
        if (bankSnap.exists()) setBank(bankSnap.data() as BankDetails)
      })
      .finally(() => setLoading(false))
  }, [labId, deskNumber, firebaseUser])

  if (authLoading || loading || !firebaseUser) {
    return <LoadingSpinner size="lg" fullPage />
  }

  if (!lab || !deskParam || Number.isNaN(deskNumber) || deskNumber < 1 || deskNumber > 6) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-600">
          We couldn&apos;t find that lab or desk selection.
        </p>
        <Link href="/available-labs">
          <Button>← Back to Available Labs</Button>
        </Link>
      </div>
    )
  }

  const studentName = user?.fullName ?? 'Language Labs Student'
  const studentEmail = user?.email ?? firebaseUser.email ?? ''
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''
  const whatsappLink = getWhatsAppLink(
    whatsappNumber,
    `Hi! I'm ${studentName}. I have transferred payment for ${lab.name}, Desk ${deskNumber}. Please find my receipt attached. Email: ${studentEmail}`
  )

  async function sendReceipt() {
    if (!lab || processing) return
    setProcessing(true)
    setError('')
    try {
      const bookingRef = doc(collection(db, 'bookings'))
      const labRef = doc(db, 'labs', lab.id)

      // Transaction: claim the seat only if it's still available or already claimed by me
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(labRef)
        if (!snap.exists()) throw new Error('lab-missing')
        const seats = [...((snap.data() as Lab).seats ?? [])]
        const index = seats.findIndex((s) => s.seatNumber === deskNumber)
        const isAlreadyMine =
          seats[index]?.studentId === firebaseUser!.uid &&
          (seats[index]?.status === 'pending' || seats[index]?.status === 'confirmed')

        if (index === -1 || (seats[index].status !== 'available' && !isAlreadyMine)) {
          throw new Error('seat-taken')
        }

        if (!isAlreadyMine) {
          seats[index] = {
            ...seats[index],
            status: 'pending',
            studentId: firebaseUser!.uid,
            bookingId: bookingRef.id,
          }
          tx.update(labRef, { seats })
          tx.set(bookingRef, {
            labId: lab.id,
            studentId: firebaseUser!.uid,
            studentName,
            studentEmail,
            seatNumber: deskNumber,
            paymentStatus: 'pending',
            createdAt: Timestamp.now(),
          })
        }
      })

      setBooked(true)

      // Notify admin — fire and forget
      fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment_receipt',
          studentName,
          studentEmail,
          message: `Lab: ${lab.name} — Desk ${deskNumber}. The student is sending the receipt via WhatsApp.`,
        }),
      }).catch(() => {})

      // Open WhatsApp with the pre-filled message (fallback link shown below)
      window.open(whatsappLink, '_blank', 'noopener,noreferrer')
    } catch (err) {
      const message =
        err instanceof Error && err.message === 'seat-taken'
          ? 'Oh no — this desk was just taken by someone else. Please pick another desk.'
          : 'Something went wrong. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-center text-2xl font-bold text-deep-blue sm:text-3xl">
        Almost There! Complete Your Payment 💳
      </h1>

      {/* Booking summary */}
      <Card className="mt-8 bg-deep-blue">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-300">Your selection</p>
            <p className="text-lg font-bold text-lab-white">{lab.name}</p>
          </div>
          <div className="rounded-lab bg-electric-blue px-4 py-2 text-center">
            <p className="text-xs text-blue-light">Desk</p>
            <p className="text-xl font-bold text-lab-white">{deskNumber}</p>
          </div>
        </div>
      </Card>

      {/* Bank details */}
      <Card className="mt-6">
        <h2 className="font-bold text-deep-blue">🏦 Bank Transfer Details</h2>
        <dl className="mt-4 flex flex-col gap-3 text-sm">
          {[
            ['Account Name', bank.accountName],
            ['Account Number', bank.accountNumber],
            ['Bank', bank.bankName],
            ['Branch', bank.branch],
            [
              'Amount to Pay',
              lab.fee ? `Rs. ${lab.fee.toLocaleString()}` : 'Ask via WhatsApp',
            ],
            ['Reference', `${studentName} — ${lab.name}`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col justify-between gap-1 border-b border-blue-light pb-2 sm:flex-row"
            >
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-semibold text-deep-blue">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Instructions */}
      <p className="mt-6 rounded-lab bg-blue-light px-5 py-4 text-sm leading-relaxed text-deep-blue">
        💡{' '}
        {bank.instructions ||
          'Transfer the exact amount and send us your receipt via WhatsApp. Your desk will be confirmed once we verify your payment.'}
      </p>

      {error && (
        <div className="mt-4 rounded-lab bg-red-50 px-5 py-4 text-sm text-seat-reserved">
          {error}
          {error.includes('desk') && (
            <Link
              href={`/available-labs/${lab.id}`}
              className="ml-1 font-semibold underline"
            >
              Choose another desk
            </Link>
          )}
        </div>
      )}

      {/* WhatsApp action */}
      {booked ? (
        <div className="mt-6 text-center">
          <p className="rounded-lab bg-green-50 px-5 py-4 text-sm text-green-700">
            ✅ Your desk is now held as pending! If WhatsApp didn&apos;t open,{' '}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              tap here to send your receipt
            </a>
            .
          </p>
        </div>
      ) : (
        <button
          onClick={sendReceipt}
          disabled={processing}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-lab bg-[#25D366] px-6 py-4 text-lg font-bold text-white transition-colors hover:bg-[#1EBE5D] disabled:opacity-60"
        >
          {processing ? (
            <LoadingSpinner size="sm" />
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          )}
          Send Payment Receipt via WhatsApp
        </button>
      )}

      {/* Important note */}
      <p className="mt-6 text-center text-sm leading-relaxed text-gray-500">
        After sending your receipt please wait for admin confirmation. You will
        receive a confirmation email once your payment is verified and your
        seat is officially reserved.
      </p>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" fullPage />}>
      <PaymentContent />
    </Suspense>
  )
}
