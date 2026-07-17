'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  getDocument,
  queryCollection,
  updateDocument,
} from '@/lib/firestore'
import { COURSE_MODULES, formatDate, getWhatsAppLink } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton'
import { toast } from '@/hooks/useToast'
import type { AttendanceRecord, Booking, Lab, User } from '@/types'

interface StudentRow {
  studentId: string
  name: string
  phone?: string
  present: boolean
}

function AttendanceContent() {
  const labParam = useSearchParams().get('lab')

  const [labs, setLabs] = useState<Lab[] | null>(null)
  const [labId, setLabId] = useState('')
  const [session, setSession] = useState(1)
  const [rows, setRows] = useState<StudentRow[]>([])
  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [loadingRows, setLoadingRows] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [weekBusy, setWeekBusy] = useState(false)

  const week = Math.ceil(session / 2)
  const selectedLab = labs?.find((l) => l.id === labId)

  // Load ongoing labs
  useEffect(() => {
    queryCollection<Lab>('labs', 'status', '==', 'ongoing')
      .then((ongoing) => {
        setLabs(ongoing)
        if (labParam && ongoing.some((l) => l.id === labParam)) {
          setLabId(labParam)
        } else if (ongoing.length === 1) {
          setLabId(ongoing[0].id)
        }
      })
      .catch(() => setLabs([]))
  }, [labParam])

  // Load students + existing attendance whenever lab/session changes
  useEffect(() => {
    if (!labId) return
    setLoadingRows(true)
    setSavedMessage('')
    Promise.all([
      queryCollection<Booking>('bookings', 'labId', '==', labId),
      queryCollection<AttendanceRecord>('attendance', 'labId', '==', labId),
    ])
      .then(async ([bookings, attendance]) => {
        const confirmed = bookings
          .filter((b) => b.paymentStatus === 'confirmed')
          .sort((a, b) => a.seatNumber - b.seatNumber)

        // Phone numbers live on the user documents
        const users = await Promise.all(
          confirmed.map((b) => getDocument<User>('users', b.studentId))
        )

        const existing = new Map(
          attendance
            .filter((a) => a.sessionNumber === session)
            .map((a) => [a.studentId, a.present])
        )

        setRows(
          confirmed.map((booking, i) => ({
            studentId: booking.studentId,
            name: booking.studentName,
            phone: users[i]?.phone,
            present: existing.get(booking.studentId) ?? true,
          }))
        )
        setHistory(
          attendance.sort((a, b) => a.sessionNumber - b.sessionNumber)
        )
      })
      .finally(() => setLoadingRows(false))
  }, [labId, session])

  async function saveAttendance() {
    if (!labId) return
    setSaving(true)
    setSavedMessage('')
    try {
      // Deterministic ids make re-saving a session idempotent
      await Promise.all(
        rows.map((row) =>
          setDoc(doc(db, 'attendance', `${labId}_${session}_${row.studentId}`), {
            studentId: row.studentId,
            labId,
            sessionNumber: session,
            weekNumber: week,
            present: row.present,
            date: Timestamp.now(),
          })
        )
      )
      // Refresh local history
      setHistory((current) => {
        const rest = current.filter((a) => a.sessionNumber !== session)
        const updated = rows.map((row) => ({
          id: `${labId}_${session}_${row.studentId}`,
          studentId: row.studentId,
          labId,
          sessionNumber: session,
          weekNumber: week,
          present: row.present,
          date: Timestamp.now(),
        }))
        return [...rest, ...updated].sort(
          (a, b) => a.sessionNumber - b.sessionNumber
        )
      })
      toast.success(`Session ${session} attendance saved.`)
    } catch {
      toast.error('Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleModule(module: string) {
    if (!selectedLab) return
    const current = selectedLab.modulesCompleted ?? []
    const updated = current.includes(module)
      ? current.filter((m) => m !== module)
      : [...current, module]
    try {
      await updateDocument<Lab>('labs', selectedLab.id, {
        modulesCompleted: updated,
      })
      setLabs(
        (labs) =>
          labs?.map((l) =>
            l.id === selectedLab.id ? { ...l, modulesCompleted: updated } : l
          ) ?? null
      )
    } catch {
      toast.error('Could not update the module. Please try again.')
    }
  }

  async function markWeekComplete() {
    if (!selectedLab) return
    setWeekBusy(true)
    try {
      await updateDocument<Lab>('labs', selectedLab.id, { weekCompleted: week })
      setLabs(
        (current) =>
          current?.map((l) =>
            l.id === selectedLab.id ? { ...l, weekCompleted: week } : l
          ) ?? null
      )
      toast.success(`Week ${week} marked as complete.`)
    } catch {
      toast.error('Could not update the week. Please try again.')
    } finally {
      setWeekBusy(false)
    }
  }

  if (!labs) {
    return (
      <div className="mt-6 flex flex-col gap-6">
        <Skeleton className="h-24" />
        <TableSkeleton rows={6} />
      </div>
    )
  }

  // History grouped by session
  const sessionsInHistory = [...new Set(history.map((a) => a.sessionNumber))]

  return (
    <>
      {/* Selectors */}
      <Card className="mt-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lab" className="text-sm font-medium text-deep-blue">
              Lab
            </label>
            <select
              id="lab"
              value={labId}
              onChange={(e) => setLabId(e.target.value)}
              className="rounded-lab border border-gray-300 bg-lab-white px-4 py-2.5 text-deep-blue outline-none focus:border-deep-blue"
            >
              <option value="">Select an ongoing lab…</option>
              {labs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="session"
              className="text-sm font-medium text-deep-blue"
            >
              Session
            </label>
            <select
              id="session"
              value={session}
              onChange={(e) => setSession(Number(e.target.value))}
              className="rounded-lab border border-gray-300 bg-lab-white px-4 py-2.5 text-deep-blue outline-none focus:border-deep-blue"
            >
              {Array.from({ length: 16 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Session {i + 1} (Week {Math.ceil((i + 1) / 2)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {!labId ? (
        <p className="mt-10 text-center text-gray-500">
          {labs.length === 0
            ? 'No ongoing labs — attendance opens once a lab starts.'
            : 'Select a lab to mark attendance.'}
        </p>
      ) : loadingRows ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <>
          {/* Attendance table */}
          <Card className="mt-6">
            <h2 className="font-bold text-deep-blue">
              Session {session} · Week {week}
            </h2>
            {rows.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">
                No confirmed students in this lab yet.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-blue-light">
                {rows.map((row) => (
                  <li
                    key={row.studentId}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <span className="font-medium text-deep-blue">
                      {row.name}
                    </span>
                    <span className="flex items-center gap-3">
                      {row.phone && (
                        <a
                          href={getWhatsAppLink(
                            row.phone,
                            `Hi ${row.name}! This is Language Labs.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Contact on WhatsApp"
                          className="text-xl"
                        >
                          💬
                        </a>
                      )}
                      <button
                        onClick={() =>
                          setRows((current) =>
                            current.map((r) =>
                              r.studentId === row.studentId
                                ? { ...r, present: !r.present }
                                : r
                            )
                          )
                        }
                        aria-label={`${row.name}: ${row.present ? 'present' : 'absent'} — tap to toggle`}
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-lab-white transition-colors ${
                          row.present ? 'bg-green-500' : 'bg-seat-reserved'
                        }`}
                      >
                        {row.present ? '✓' : '✗'}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {savedMessage && (
              <p className="mt-4 rounded-lab bg-blue-light px-4 py-3 text-sm text-deep-blue">
                {savedMessage}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                loading={saving}
                onClick={saveAttendance}
                disabled={rows.length === 0}
              >
                Save Attendance
              </Button>
              <Button
                variant="secondary"
                loading={weekBusy}
                onClick={markWeekComplete}
                disabled={(selectedLab?.weekCompleted ?? 0) >= week}
              >
                {(selectedLab?.weekCompleted ?? 0) >= week
                  ? `Week ${week} already complete ✓`
                  : `Mark Week ${week} Progress as Complete`}
              </Button>
            </div>
          </Card>

          {/* Module completion — shown on the student dashboard */}
          <Card className="mt-6">
            <h2 className="font-bold text-deep-blue">Module Completion 🧬</h2>
            <p className="mt-1 text-sm text-gray-500">
              Toggle the modules this lab has covered — students see these on
              their progress dashboard.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {COURSE_MODULES.map((module) => {
                const done = (selectedLab?.modulesCompleted ?? []).includes(module)
                return (
                  <button
                    key={module}
                    onClick={() => toggleModule(module)}
                    className={`rounded-lab border p-3 text-center text-sm font-medium transition-colors ${
                      done
                        ? 'border-green-300 bg-green-50 text-green-700'
                        : 'border-blue-light bg-lab-white text-gray-500 hover:border-electric-blue/50'
                    }`}
                  >
                    {done ? '✅' : '⬜'} {module}
                  </button>
                )
              })}
            </div>
          </Card>

          {/* History */}
          <Card className="mt-6">
            <h2 className="font-bold text-deep-blue">Attendance History</h2>
            {sessionsInHistory.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">
                No attendance recorded for this lab yet.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-blue-light">
                {sessionsInHistory.map((s) => {
                  const records = history.filter((a) => a.sessionNumber === s)
                  const present = records.filter((a) => a.present).length
                  return (
                    <li
                      key={s}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <span className="font-medium text-deep-blue">
                        Session {s}{' '}
                        <span className="text-xs text-gray-400">
                          · Week {Math.ceil(s / 2)} ·{' '}
                          {formatDate(records[0].date.toDate())}
                        </span>
                      </span>
                      <span
                        className={`font-semibold ${
                          present === records.length
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {present} / {records.length} present
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </>
  )
}

export default function AdminAttendancePage() {
  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-deep-blue">Attendance 📋</h1>
      <p className="mt-1 text-sm text-gray-500">
        Mark who showed up to each session.
      </p>
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <AttendanceContent />
      </Suspense>
    </div>
  )
}
