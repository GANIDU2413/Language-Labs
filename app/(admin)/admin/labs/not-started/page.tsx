'use client'

import { useEffect, useState } from 'react'
import { doc, Timestamp, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getCollection, queryCollection } from '@/lib/firestore'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { CardGridSkeleton } from '@/components/ui/Skeleton'
import { toast } from '@/hooks/useToast'
import type { Booking, Lab } from '@/types'

type DialogState = {
  booking: Booking
  lab: Lab
  action: 'confirm' | 'reject'
} | null

function confirmedEmailHtml(name: string, lab: Lab, loginUrl: string): string {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;background:#E6F1FB;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;">
    <div style="background:#0A1628;padding:24px;text-align:center;">
      <span style="font-size:20px;font-weight:bold;color:#FFFFFF;">🧪 Language <span style="color:#1E90FF;">Labs</span></span>
    </div>
    <div style="padding:28px;color:#0A1628;font-size:15px;line-height:1.6;">
      <p>Hi ${name},</p>
      <p>🎉 <strong>Congratulations — your seat is officially confirmed!</strong>
      Your payment has been verified and your desk at <strong>${lab.name}</strong> is reserved.</p>
      <p style="background:#E6F1FB;border-radius:12px;padding:14px;">
        📅 Starts ${formatDate(lab.startDate.toDate())}<br/>
        🕕 ${lab.schedule}${lab.duration ? `<br/>⏱️ ${lab.duration}` : ''}
      </p>
      <p>Your student dashboard is now unlocked. Log in with your email and
      password to track your progress, access resources and more.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${loginUrl}" style="background:#1E90FF;color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:bold;">Open My Dashboard</a>
      </p>
      <p>See you in the lab! 🔬</p>
    </div>
  </div>
</div>`
}

function rejectedEmailHtml(name: string, lab: Lab): string {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;background:#E6F1FB;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;">
    <div style="background:#0A1628;padding:24px;text-align:center;">
      <span style="font-size:20px;font-weight:bold;color:#FFFFFF;">🧪 Language <span style="color:#1E90FF;">Labs</span></span>
    </div>
    <div style="padding:28px;color:#0A1628;font-size:15px;line-height:1.6;">
      <p>Hi ${name},</p>
      <p>Unfortunately we couldn't verify your payment for <strong>${lab.name}</strong>,
      so your desk has been released for now.</p>
      <p>If you believe this is a mistake, please message us on WhatsApp with
      your receipt and we'll sort it out right away.</p>
    </div>
  </div>
</div>`
}

export default function NotStartedLabsPage() {
  const [labs, setLabs] = useState<Lab[] | null>(null)
  const [bookingsByLab, setBookingsByLab] = useState<Record<string, Booking[]>>({})
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<DialogState>(null)
  const [busy, setBusy] = useState(false)
  const [dialogError, setDialogError] = useState('')

  useEffect(() => {
    Promise.all([
      queryCollection<Lab>('labs', 'status', '==', 'notStarted'),
      getCollection<Booking>('bookings'),
    ])
      .then(([notStarted, allBookings]) => {
        setLabs(
          notStarted.sort(
            (a, b) => a.startDate.toMillis() - b.startDate.toMillis()
          )
        )
        const grouped: Record<string, Booking[]> = {}
        for (const booking of allBookings) {
          ;(grouped[booking.labId] ??= []).push(booking)
        }
        for (const list of Object.values(grouped)) {
          list.sort((a, b) => a.seatNumber - b.seatNumber)
        }
        setBookingsByLab(grouped)
      })
      .catch(() => setLabs([]))
  }, [])

  async function processDialog() {
    if (!dialog) return
    const { booking, lab, action } = dialog
    setBusy(true)
    setDialogError('')
    try {
      const batch = writeBatch(db)
      const bookingRef = doc(db, 'bookings', booking.id)
      const labRef = doc(db, 'labs', lab.id)
      const confirmedAt = Timestamp.now()

      // Update the seat in the lab document
      const seats = (lab.seats ?? []).map((seat) => {
        if (seat.seatNumber !== booking.seatNumber) return seat
        return action === 'confirm'
          ? { ...seat, status: 'confirmed' as const }
          : { seatNumber: seat.seatNumber, status: 'available' as const }
      })
      batch.update(labRef, { seats })

      if (action === 'confirm') {
        batch.update(bookingRef, {
          paymentStatus: 'confirmed',
          paymentConfirmedAt: confirmedAt,
        })
        batch.update(doc(db, 'users', booking.studentId), {
          status: 'enrolled',
          dashboardUnlocked: true,
          enrolledLabId: lab.id,
        })
      } else {
        batch.update(bookingRef, { paymentStatus: 'rejected' })
      }

      await batch.commit()

      // Email the student — non-blocking
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'confirm'
            ? {
                to: booking.studentEmail,
                subject: 'Your Language Labs Seat is Confirmed! 🎉',
                html: confirmedEmailHtml(
                  booking.studentName,
                  lab,
                  `${window.location.origin}/login`
                ),
              }
            : {
                to: booking.studentEmail,
                subject: 'About Your Language Labs Booking',
                html: rejectedEmailHtml(booking.studentName, lab),
              }
        ),
      }).catch(() => {})

      // Update local state
      setBookingsByLab((current) => ({
        ...current,
        [lab.id]: (current[lab.id] ?? []).map((b) =>
          b.id === booking.id
            ? {
                ...b,
                paymentStatus: action === 'confirm' ? 'confirmed' : 'rejected',
                ...(action === 'confirm' ? { paymentConfirmedAt: confirmedAt } : {}),
              }
            : b
        ),
      }))
      setLabs((current) =>
        current?.map((l) => (l.id === lab.id ? { ...l, seats } : l)) ?? null
      )
      setDialog(null)
      toast.success(
        action === 'confirm'
          ? 'Payment confirmed — the student was notified by email.'
          : 'Booking rejected — the desk is available again.'
      )
    } catch {
      setDialogError('Update failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!labs) {
    return (
      <div className="px-4 py-8 sm:px-8">
        <CardGridSkeleton
          count={3}
          cardClassName="h-52"
          gridClassName="grid-cols-1"
        />
      </div>
    )
  }

  const visible = labs.filter((lab) =>
    lab.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-deep-blue">
        New Labs (Not Started) 🧪
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Verify payments and manage bookings before each lab begins.
      </p>

      <div className="mt-6 max-w-sm">
        <Input
          label="Search labs"
          name="search"
          placeholder="Type a lab name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <p className="mt-12 text-center text-gray-500">
          {search ? 'No labs match your search.' : 'No labs waiting to start.'}
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {visible.map((lab) => {
            const bookings = bookingsByLab[lab.id] ?? []
            const confirmedCount = bookings.filter(
              (b) => b.paymentStatus === 'confirmed'
            ).length
            return (
              <Card key={lab.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-deep-blue">
                      {lab.name}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      📅 Starts {formatDate(lab.startDate.toDate())} · 🕕{' '}
                      {lab.schedule}
                    </p>
                  </div>
                  <Badge variant={confirmedCount === 6 ? 'success' : 'info'}>
                    {confirmedCount} / 6 seats confirmed
                  </Badge>
                </div>

                {bookings.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-400">No bookings yet.</p>
                ) : (
                  <ul className="mt-4 flex flex-col divide-y divide-blue-light">
                    {bookings.map((booking) => (
                      <li
                        key={booking.id}
                        className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-deep-blue">
                            {booking.studentName}
                            <span className="ml-2 rounded-full bg-blue-light px-2 py-0.5 text-xs font-bold text-electric-blue">
                              Desk {booking.seatNumber}
                            </span>
                          </p>
                          <p className="truncate text-sm text-gray-500">
                            {booking.studentEmail}
                          </p>
                        </div>

                        {booking.paymentStatus === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setDialogError('')
                                setDialog({ booking, lab, action: 'confirm' })
                              }}
                            >
                              Confirm Payment ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setDialogError('')
                                setDialog({ booking, lab, action: 'reject' })
                              }}
                            >
                              Reject ✗
                            </Button>
                          </div>
                        )}
                        {booking.paymentStatus === 'confirmed' && (
                          <div className="text-right">
                            <Badge variant="success">Confirmed</Badge>
                            {booking.paymentConfirmedAt && (
                              <p className="mt-1 text-xs text-gray-400">
                                {formatDate(booking.paymentConfirmedAt.toDate())}
                              </p>
                            )}
                          </div>
                        )}
                        {booking.paymentStatus === 'rejected' && (
                          <Badge variant="danger">Rejected</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Confirmation dialog */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-blue/60 px-4">
          <Card className="w-full max-w-sm text-center">
            <p className="text-3xl">
              {dialog.action === 'confirm' ? '✅' : '❌'}
            </p>
            <h3 className="mt-2 font-bold text-deep-blue">
              {dialog.action === 'confirm'
                ? `Confirm payment for ${dialog.booking.studentName}?`
                : `Reject payment from ${dialog.booking.studentName}?`}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {dialog.action === 'confirm'
                ? `Desk ${dialog.booking.seatNumber} will be reserved and their dashboard unlocked.`
                : `Desk ${dialog.booking.seatNumber} will return to available for other students.`}
            </p>
            {dialogError && (
              <p className="mt-3 rounded-lab bg-red-50 px-4 py-3 text-sm text-seat-reserved">
                {dialogError}
              </p>
            )}
            <div className="mt-5 flex justify-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setDialog(null)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                variant={dialog.action === 'confirm' ? 'primary' : 'danger'}
                loading={busy}
                onClick={processDialog}
              >
                {dialog.action === 'confirm' ? 'Yes, Confirm' : 'Yes, Reject'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
