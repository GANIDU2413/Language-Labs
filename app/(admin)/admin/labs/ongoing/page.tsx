'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCollection, queryCollection, updateDocument } from '@/lib/firestore'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { CardGridSkeleton } from '@/components/ui/Skeleton'
import { toast } from '@/hooks/useToast'
import type { AttendanceRecord, Booking, Lab } from '@/types'

/** Estimated session date: two sessions per week from the start date */
function sessionDate(lab: Lab, sessionNumber: number): Date {
  const week = Math.ceil(sessionNumber / 2)
  const date = lab.startDate.toDate()
  date.setDate(date.getDate() + (week - 1) * 7 + (sessionNumber % 2 === 0 ? 3 : 0))
  return date
}

export default function OngoingLabsPage() {
  const [labs, setLabs] = useState<Lab[] | null>(null)
  const [bookingsByLab, setBookingsByLab] = useState<Record<string, Booking[]>>({})
  const [attendanceByLab, setAttendanceByLab] = useState<
    Record<string, AttendanceRecord[]>
  >({})
  const [completeLabModal, setCompleteLabModal] = useState<Lab | null>(null)
  const [completeBusy, setCompleteBusy] = useState(false)
  const [completeError, setCompleteError] = useState('')

  useEffect(() => {
    Promise.all([
      queryCollection<Lab>('labs', 'status', '==', 'ongoing'),
      getCollection<Booking>('bookings'),
      getCollection<AttendanceRecord>('attendance'),
    ])
      .then(([ongoing, bookings, attendance]) => {
        setLabs(ongoing)
        const byLab: Record<string, Booking[]> = {}
        for (const b of bookings) {
          if (b.paymentStatus === 'confirmed') (byLab[b.labId] ??= []).push(b)
        }
        setBookingsByLab(byLab)
        const attByLab: Record<string, AttendanceRecord[]> = {}
        for (const a of attendance) (attByLab[a.labId] ??= []).push(a)
        setAttendanceByLab(attByLab)
      })
      .catch(() => setLabs([]))
  }, [])

  async function handleCompleteLab() {
    if (!completeLabModal) return
    setCompleteBusy(true)
    setCompleteError('')
    try {
      await updateDocument<Lab>('labs', completeLabModal.id, {
        status: 'completed',
        weekCompleted: 8,
        currentWeek: 8,
      })
      setLabs((current) =>
        current?.filter((l) => l.id !== completeLabModal.id) ?? null
      )
      setCompleteLabModal(null)
      toast.success(
        `${completeLabModal.name} marked as Completed! All enrolled students can now access their Certificate. 🎓`
      )
    } catch {
      setCompleteError('Could not complete the lab. Please try again.')
    } finally {
      setCompleteBusy(false)
    }
  }

  if (!labs) {
    return (
      <div className="px-4 py-8 sm:px-8">
        <CardGridSkeleton
          count={2}
          cardClassName="h-96"
          gridClassName="grid-cols-1"
        />
      </div>
    )
  }

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-deep-blue">Ongoing Labs ⚗️</h1>
      <p className="mt-1 text-sm text-gray-500">
        Track session progress and student attendance for active labs.
      </p>

      {labs.length === 0 ? (
        <p className="mt-12 text-center text-gray-500">
          No labs are running right now.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {labs.map((lab) => {
            const students = (bookingsByLab[lab.id] ?? []).sort(
              (a, b) => a.seatNumber - b.seatNumber
            )
            const attendance = attendanceByLab[lab.id] ?? []
            const weekCompleted = lab.weekCompleted ?? 0

            return (
              <Card key={lab.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-deep-blue">
                      {lab.name}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      📅 Started {formatDate(lab.startDate.toDate())} · 🕕{' '}
                      {lab.schedule}
                    </p>
                  </div>
                  <Badge variant="success">
                    Week {Math.min(weekCompleted + 1, 8)} of 8
                  </Badge>
                </div>

                {/* 16-session progress tracker */}
                <h3 className="mt-5 text-sm font-semibold text-deep-blue">
                  Session progress
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Array.from({ length: 8 }, (_, w) => {
                    const week = w + 1
                    const done = week <= weekCompleted
                    return (
                      <div
                        key={week}
                        className={`rounded-lab border p-2 text-center ${
                          done
                            ? 'border-green-200 bg-green-50'
                            : 'border-blue-light bg-lab-white'
                        }`}
                      >
                        <p className="text-xs font-bold text-deep-blue">
                          Week {week} {done && '✓'}
                        </p>
                        <div className="mt-1 flex justify-center gap-1">
                          {[week * 2 - 1, week * 2].map((session) => (
                            <span
                              key={session}
                              title={formatDate(sessionDate(lab, session))}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                done
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-light text-gray-500'
                              }`}
                            >
                              S{session} {done ? '✓' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Enrolled students with attendance rate */}
                <h3 className="mt-5 text-sm font-semibold text-deep-blue">
                  Enrolled students ({students.length} / 6)
                </h3>
                {students.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-400">
                    No confirmed students.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col divide-y divide-blue-light">
                    {students.map((student) => {
                      const records = attendance.filter(
                        (a) => a.studentId === student.studentId
                      )
                      const rate = records.length
                        ? Math.round(
                            (records.filter((a) => a.present).length /
                              records.length) *
                              100
                          )
                        : null
                      return (
                        <li
                          key={student.id}
                          className="flex items-center justify-between py-2 text-sm"
                        >
                          <span className="font-medium text-deep-blue">
                            {student.studentName}
                            <span className="ml-2 text-xs text-gray-400">
                              Desk {student.seatNumber}
                            </span>
                          </span>
                          <span
                            className={`font-semibold ${
                              rate === null
                                ? 'text-gray-400'
                                : rate >= 75
                                  ? 'text-green-600'
                                  : 'text-seat-reserved'
                            }`}
                          >
                            {rate === null ? 'No records' : `${rate}% attendance`}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* Quick links */}
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/admin/attendance?lab=${lab.id}`}
                    className="block sm:flex-1"
                  >
                    <Button size="sm" className="w-full">
                      📋 Mark Attendance
                    </Button>
                  </Link>
                  <Link
                    href={`/admin/inclass-test?lab=${lab.id}`}
                    className="block sm:flex-1"
                  >
                    <Button size="sm" variant="secondary" className="w-full">
                      ⏱️ Create In-Class Test
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setCompleteError('')
                      setCompleteLabModal(lab)
                    }}
                    className="w-full sm:flex-1 border-green-300 text-green-700 bg-green-50 hover:bg-green-100"
                  >
                    🎓 Complete Lab
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Complete Lab Modal */}
      {completeLabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-blue/60 px-4">
          <Card className="w-full max-w-md text-left">
            <div className="text-center">
              <p className="text-4xl">🎓</p>
              <h3 className="mt-2 text-xl font-bold text-deep-blue">
                Complete {completeLabModal.name}?
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                This marks all 16 sessions as completed. All enrolled students will immediately be awarded and able to download their Certificate of Completion.
              </p>
            </div>

            {completeError && (
              <p className="mt-3 rounded-lab bg-red-50 px-4 py-3 text-sm text-seat-reserved">
                {completeError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setCompleteLabModal(null)}
                disabled={completeBusy}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={completeBusy}
                onClick={handleCompleteLab}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                Yes, Complete Lab 🎓
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
