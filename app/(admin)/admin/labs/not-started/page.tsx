'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { removeStudentFromWaitingList } from '@/lib/firestore'
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

interface EditLabFormState {
  id: string
  name: string
  duration: string
  startDate: string
  schedule: string
  fee: string
}

function timestampToDateInput(ts?: Timestamp): string {
  if (!ts) return ''
  const date = ts.toDate()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
  const router = useRouter()
  const [labs, setLabs] = useState<Lab[] | null>(null)
  const [bookingsByLab, setBookingsByLab] = useState<Record<string, Booking[]>>({})
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<DialogState>(null)
  const [busy, setBusy] = useState(false)
  const [dialogError, setDialogError] = useState('')

  const [startLabModal, setStartLabModal] = useState<Lab | null>(null)
  const [startBusy, setStartBusy] = useState(false)
  const [startError, setStartError] = useState('')
  const [autoConfirmPending, setAutoConfirmPending] = useState(true)

  const [editModal, setEditModal] = useState<EditLabFormState | null>(null)
  const [editBusy, setEditBusy] = useState(false)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  function handleOpenEdit(lab: Lab) {
    setEditErrors({})
    setEditModal({
      id: lab.id,
      name: lab.name || '',
      duration: lab.duration || '',
      startDate: timestampToDateInput(lab.startDate),
      schedule: lab.schedule || '',
      fee: lab.fee !== undefined && lab.fee !== null ? String(lab.fee) : '',
    })
  }

  async function handleUpdateLab(e: React.FormEvent) {
    e.preventDefault()
    if (!editModal) return

    const errors: Record<string, string> = {}
    if (!editModal.name.trim()) {
      errors.name = 'Lab name is required.'
    } else if (editModal.name.trim().length < 2) {
      errors.name = 'Lab name must be at least 2 characters.'
    }

    if (!editModal.duration.trim()) {
      errors.duration = 'Time duration is required.'
    }

    if (!editModal.startDate) {
      errors.startDate = 'Start date is required.'
    } else if (Number.isNaN(Date.parse(editModal.startDate))) {
      errors.startDate = 'Please enter a valid start date.'
    }

    if (!editModal.schedule.trim()) {
      errors.schedule = 'Class schedule is required.'
    }

    let parsedFee: number | null = null
    if (editModal.fee.trim() !== '') {
      const num = Number(editModal.fee.trim())
      if (Number.isNaN(num) || num <= 0) {
        errors.fee = 'Fee must be a positive number.'
      } else {
        parsedFee = num
      }
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors)
      return
    }

    setEditBusy(true)
    setEditErrors({})

    try {
      const [y, m, d] = editModal.startDate.split('-').map(Number)
      const dateObj = new Date(y, m - 1, d, 12, 0, 0)
      const newStartDate = Timestamp.fromDate(dateObj)

      const updatePayload: Record<string, any> = {
        name: editModal.name.trim(),
        duration: editModal.duration.trim(),
        startDate: newStartDate,
        schedule: editModal.schedule.trim(),
      }

      if (parsedFee !== null) {
        updatePayload.fee = parsedFee
      } else {
        updatePayload.fee = deleteField()
      }

      await updateDoc(doc(db, 'labs', editModal.id), updatePayload)

      setLabs((current) =>
        current?.map((lab) =>
          lab.id === editModal.id
            ? {
                ...lab,
                name: editModal.name.trim(),
                duration: editModal.duration.trim(),
                startDate: newStartDate,
                schedule: editModal.schedule.trim(),
                ...(parsedFee !== null ? { fee: parsedFee } : { fee: undefined }),
              }
            : lab
        ) ?? null
      )

      toast.success('Lab details updated successfully! ✨')
      setEditModal(null)
    } catch (err) {
      console.error('Failed to update lab:', err)
      setEditErrors({ form: 'Could not update the lab. Please try again.' })
      toast.error('Could not update the lab. Please try again.')
    } finally {
      setEditBusy(false)
    }
  }

  useEffect(() => {
    const qLabs = query(collection(db, 'labs'), where('status', '==', 'notStarted'))
    const unsubLabs = onSnapshot(
      qLabs,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lab)
        setLabs(list.sort((a, b) => a.startDate.toMillis() - b.startDate.toMillis()))
      },
      () => setLabs([])
    )

    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snap) => {
      const allBookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking)
      const grouped: Record<string, Booking[]> = {}
      for (const booking of allBookings) {
        ;(grouped[booking.labId] ??= []).push(booking)
      }
      for (const list of Object.values(grouped)) {
        list.sort((a, b) => a.seatNumber - b.seatNumber)
      }
      setBookingsByLab(grouped)
    })

    return () => {
      unsubLabs()
      unsubBookings()
    }
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

        // Automatically remove user from waiting list upon payment confirmation
        await removeStudentFromWaitingList(
          booking.studentEmail,
          booking.studentId,
          batch
        )
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

  async function handleStartLab() {
    if (!startLabModal) return
    setStartBusy(true)
    setStartError('')
    const lab = startLabModal
    const bookings = bookingsByLab[lab.id] ?? []
    const pendingBookings = bookings.filter((b) => b.paymentStatus === 'pending')

    try {
      const batch = writeBatch(db)
      const labRef = doc(db, 'labs', lab.id)
      const now = Timestamp.now()

      let updatedSeats = [...(lab.seats ?? [])]

      if (autoConfirmPending && pendingBookings.length > 0) {
        for (const booking of pendingBookings) {
          const bookingRef = doc(db, 'bookings', booking.id)
          batch.update(bookingRef, {
            paymentStatus: 'confirmed',
            paymentConfirmedAt: now,
          })
          batch.update(doc(db, 'users', booking.studentId), {
            status: 'enrolled',
            dashboardUnlocked: true,
            enrolledLabId: lab.id,
          })

          // Automatically remove user from waiting list upon payment confirmation
          await removeStudentFromWaitingList(
            booking.studentEmail,
            booking.studentId,
            batch
          )

          // Non-blocking confirmation email
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: booking.studentEmail,
              subject: 'Your Language Labs Seat is Confirmed! 🎉',
              html: confirmedEmailHtml(
                booking.studentName,
                lab,
                `${window.location.origin}/login`
              ),
            }),
          }).catch(() => {})
        }

        updatedSeats = updatedSeats.map((seat) => {
          const match = pendingBookings.find(
            (b) => b.seatNumber === seat.seatNumber
          )
          return match ? { ...seat, status: 'confirmed' as const } : seat
        })
      }

      batch.update(labRef, {
        status: 'ongoing',
        currentWeek: lab.currentWeek ?? 1,
        seats: updatedSeats,
      })

      await batch.commit()

      setLabs((current) => current?.filter((l) => l.id !== lab.id) ?? null)
      setStartLabModal(null)
      toast.success(`${lab.name} has started and moved to Ongoing Labs! ⚗️`)
      router.push('/admin/labs/ongoing')
    } catch {
      setStartError('Could not start the lab. Please try again.')
    } finally {
      setStartBusy(false)
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

  const totalPendingPayments = (labs ?? []).reduce((sum, lab) => {
    const bookings = bookingsByLab[lab.id] ?? []
    return sum + bookings.filter((b) => b.paymentStatus === 'pending').length
  }, 0)

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-deep-blue">
        New Labs (Not Started) 🧪
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Verify payments and manage bookings before each lab begins.
      </p>

      {/* Top alert banner for pending student payments */}
      {totalPendingPayments > 0 && (
        <div className="mt-6 flex flex-col gap-3 rounded-lab border-2 border-seat-reserved bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-seat-reserved text-lg font-bold text-lab-white">
              {totalPendingPayments}
            </span>
            <div>
              <p className="font-bold text-deep-blue">
                {totalPendingPayments === 1
                  ? '1 Student Payment Waiting for Verification'
                  : `${totalPendingPayments} Student Payments Waiting for Verification`}
              </p>
              <p className="text-xs text-gray-600">
                Students have submitted payment receipts. Verify bank transfers below to reserve desks and unlock their student dashboards.
              </p>
            </div>
          </div>
        </div>
      )}

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
            const pendingCount = bookings.filter(
              (b) => b.paymentStatus === 'pending'
            ).length
            const registeredCount = bookings.filter(
              (b) => b.paymentStatus !== 'rejected'
            ).length
            const canStartLab =
              registeredCount >= 1 ||
              (lab.seats ?? []).some((s) => s.status !== 'available')

            return (
              <Card
                key={lab.id}
                className={
                  pendingCount > 0
                    ? 'border-2 border-seat-reserved ring-1 ring-seat-reserved/20'
                    : ''
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-deep-blue">
                        {lab.name}
                      </h2>
                      {pendingCount > 0 && (
                        <span className="rounded-full bg-seat-reserved px-2.5 py-0.5 text-xs font-bold text-lab-white shadow-sm">
                          {pendingCount} payment{pendingCount === 1 ? '' : 's'} to verify
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      📅 Starts {formatDate(lab.startDate.toDate())} · 🕕{' '}
                      {lab.schedule}
                      {lab.duration ? ` · ⏱️ ${lab.duration}` : ''}
                      {lab.fee ? ` · 💳 Rs. ${lab.fee.toLocaleString()}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={confirmedCount === 6 ? 'success' : 'info'}>
                      {confirmedCount} / 6 seats confirmed
                    </Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenEdit(lab)}
                      className="border border-gray-300 hover:border-electric-blue hover:text-electric-blue font-medium"
                    >
                      ✏️ Modify
                    </Button>
                    {canStartLab && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setStartError('')
                          setStartLabModal(lab)
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                      >
                        Start Lab 🚀
                      </Button>
                    )}
                  </div>
                </div>

                {bookings.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-400">No bookings yet.</p>
                ) : (
                  <ul className="mt-4 flex flex-col divide-y divide-blue-light">
                    {bookings.map((booking) => (
                      <li
                        key={booking.id}
                        className={`flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
                          booking.paymentStatus === 'pending'
                            ? 'rounded-lab bg-red-50/60 p-3 -mx-3 my-1 border border-seat-reserved/20'
                            : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-deep-blue flex items-center gap-2">
                            {booking.studentName}
                            <span className="rounded-full bg-blue-light px-2 py-0.5 text-xs font-bold text-electric-blue">
                              Desk {booking.seatNumber}
                            </span>
                            {booking.paymentStatus === 'pending' && (
                              <span className="rounded-full bg-seat-reserved px-2 py-0.5 text-[10px] font-bold text-lab-white uppercase tracking-wider">
                                Action Required
                              </span>
                            )}
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

      {/* Start Lab Modal */}
      {startLabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-blue/60 px-4">
          <Card className="w-full max-w-md text-left">
            <div className="text-center">
              <p className="text-4xl">🚀</p>
              <h3 className="mt-2 text-xl font-bold text-deep-blue">
                Start {startLabModal.name}?
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                This will transition the lab to Ongoing status and move it to the <strong>Ongoing Labs</strong> dashboard.
              </p>
            </div>

            {(() => {
              const bList = bookingsByLab[startLabModal.id] ?? []
              const conf = bList.filter((b) => b.paymentStatus === 'confirmed').length
              const pend = bList.filter((b) => b.paymentStatus === 'pending').length
              return (
                <div className="mt-4 rounded-lab bg-blue-light/50 p-4 text-sm text-gray-700 space-y-2">
                  <div className="flex justify-between font-medium">
                    <span>Confirmed Students:</span>
                    <span className="font-bold text-green-700">{conf} / 6</span>
                  </div>
                  {pend > 0 && (
                    <div className="flex justify-between font-medium">
                      <span>Pending Payments:</span>
                      <span className="font-bold text-amber-700">{pend} desk(s)</span>
                    </div>
                  )}
                  {pend > 0 && (
                    <label className="mt-3 flex items-start gap-2.5 pt-2 border-t border-blue-light cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={autoConfirmPending}
                        onChange={(e) => setAutoConfirmPending(e.target.checked)}
                        className="mt-0.5 accent-electric-blue rounded"
                      />
                      <span className="text-deep-blue font-medium">
                        Auto-confirm all {pend} pending booking(s) and unlock their student dashboards now
                      </span>
                    </label>
                  )}
                </div>
              )
            })()}

            {startError && (
              <p className="mt-3 rounded-lab bg-red-50 px-4 py-3 text-sm text-seat-reserved">
                {startError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setStartLabModal(null)}
                disabled={startBusy}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={startBusy}
                onClick={handleStartLab}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Yes, Start Lab 🚀
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modify Lab Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-blue/60 p-4">
          <Card className="w-full max-w-lg text-left max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-blue-light pb-3">
              <div>
                <h3 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                  <span>✏️</span> Modify Lab Details
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update session schedule, duration, dates, or fee for this lab.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditModal(null)}
                disabled={editBusy}
                className="rounded-full p-1 text-gray-400 hover:bg-blue-light hover:text-deep-blue transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateLab} className="mt-4 flex flex-col gap-4" noValidate>
              <Input
                label="Lab Name"
                name="name"
                value={editModal.name}
                onChange={(e) => {
                  setEditModal({ ...editModal, name: e.target.value })
                  if (editErrors.name) setEditErrors((prev) => ({ ...prev, name: '' }))
                }}
                placeholder="e.g. LanguageLab1"
                required
                error={editErrors.name}
              />

              <Input
                label="Time Duration"
                name="duration"
                value={editModal.duration}
                onChange={(e) => {
                  setEditModal({ ...editModal, duration: e.target.value })
                  if (editErrors.duration) setEditErrors((prev) => ({ ...prev, duration: '' }))
                }}
                placeholder="e.g. 8 Weeks — Twice a Week — 16 Sessions"
                required
                error={editErrors.duration}
              />

              <Input
                label="Start Date"
                name="startDate"
                type="date"
                value={editModal.startDate}
                onChange={(e) => {
                  setEditModal({ ...editModal, startDate: e.target.value })
                  if (editErrors.startDate) setEditErrors((prev) => ({ ...prev, startDate: '' }))
                }}
                required
                error={editErrors.startDate}
              />

              <Input
                label="Class Schedule"
                name="schedule"
                value={editModal.schedule}
                onChange={(e) => {
                  setEditModal({ ...editModal, schedule: e.target.value })
                  if (editErrors.schedule) setEditErrors((prev) => ({ ...prev, schedule: '' }))
                }}
                placeholder="e.g. Tuesdays and Thursdays, 6:00 PM — 7:30 PM"
                required
                error={editErrors.schedule}
              />

              <Input
                label="Lab Fee (Rs.)"
                name="fee"
                type="number"
                value={editModal.fee}
                onChange={(e) => {
                  setEditModal({ ...editModal, fee: e.target.value })
                  if (editErrors.fee) setEditErrors((prev) => ({ ...prev, fee: '' }))
                }}
                placeholder="e.g. 15000"
                error={editErrors.fee}
              />

              {editErrors.form && (
                <p className="rounded-lab bg-red-50 px-4 py-3 text-sm text-seat-reserved">
                  {editErrors.form}
                </p>
              )}

              <div className="mt-4 flex items-center justify-end gap-3 border-t border-blue-light pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditModal(null)}
                  disabled={editBusy}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={editBusy}
                >
                  Update
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
