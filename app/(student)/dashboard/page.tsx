'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getDocument, queryCollection } from '@/lib/firestore'
import { COURSE_MODULES, formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ErrorState from '@/components/ui/ErrorState'
import { CardGridSkeleton, Skeleton } from '@/components/ui/Skeleton'
import type { AttendanceRecord, Booking, Lab } from '@/types'

/** Estimated session date: two sessions per week from the start date */
function sessionDate(lab: Lab, sessionNumber: number): Date {
  const week = Math.ceil(sessionNumber / 2)
  const date = lab.startDate.toDate()
  date.setDate(date.getDate() + (week - 1) * 7 + (sessionNumber % 2 === 0 ? 3 : 0))
  return date
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

type SessionStatus = 'completed' | 'missed' | 'today' | 'upcoming'

export default function DashboardPage() {
  const { user, firebaseUser } = useAuth()
  const [lab, setLab] = useState<Lab | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  function loadData() {
    if (!user || !firebaseUser) return
    if (!user.enrolledLabId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setFetchError(false)
    Promise.all([
      getDocument<Lab>('labs', user.enrolledLabId),
      queryCollection<Booking>('bookings', 'studentId', '==', firebaseUser.uid),
      queryCollection<AttendanceRecord>(
        'attendance',
        'studentId',
        '==',
        firebaseUser.uid
      ),
    ])
      .then(([labDoc, bookings, records]) => {
        setLab(labDoc)
        setBooking(
          bookings.find(
            (b) =>
              b.labId === user.enrolledLabId && b.paymentStatus === 'confirmed'
          ) ?? null
        )
        setAttendance(records.filter((r) => r.labId === user.enrolledLabId))
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadData, [user, firebaseUser])

  if (fetchError) {
    return (
      <div className="px-4 py-8 sm:px-8">
        <ErrorState onRetry={loadData} />
      </div>
    )
  }

  if (loading || !user) {
    return (
      <div className="px-4 py-8 sm:px-8">
        <Skeleton className="h-8 w-2/3 max-w-sm" />
        <div className="mt-4">
          <CardGridSkeleton
            count={3}
            cardClassName="h-20"
            gridClassName="grid-cols-1 sm:grid-cols-3"
          />
        </div>
        <Skeleton className="mt-8 h-72" />
        <Skeleton className="mt-8 h-48" />
      </div>
    )
  }

  if (!lab) {
    return (
      <div className="px-4 py-10 sm:px-8">
        <Card className="max-w-md text-center">
          <p className="text-4xl">🔬</p>
          <p className="mt-3 font-semibold text-deep-blue">
            No lab enrolment found
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Contact us via WhatsApp if you think this is a mistake.
          </p>
        </Card>
      </div>
    )
  }

  const weekCompleted = lab?.weekCompleted ?? 0
  const today = new Date()
  const isLabFinished =
    lab?.status === 'completed' ||
    (lab?.weekCompleted ?? 0) >= Math.ceil((lab?.totalSessions ?? 16) / 2)

  function sessionStatus(session: number): SessionStatus {
    if (lab?.status === 'completed') return 'completed'
    const record = attendance.find((a) => a.sessionNumber === session)
    if (record) return record.present ? 'completed' : 'missed'
    if (Math.ceil(session / 2) <= weekCompleted) return 'completed'
    if (isSameDay(sessionDate(lab!, session), today)) return 'today'
    return 'upcoming'
  }

  const sessions = Array.from({ length: lab?.totalSessions ?? 16 }, (_, i) => i + 1)
  const completedCount = isLabFinished
    ? (lab?.totalSessions ?? 16)
    : sessions.filter((s) => ['completed', 'missed'].includes(sessionStatus(s))).length

  // Next session = first one that isn't done yet
  const nextSession = isLabFinished
    ? null
    : sessions.find(
        (s) => !['completed', 'missed'].includes(sessionStatus(s))
      )

  const modulesCompleted = lab.modulesCompleted ?? []

  return (
    <div className="px-4 py-8 sm:px-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-deep-blue">
          Welcome back to the Lab, {user.firstName}! 🔬
        </h1>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs text-gray-500">Your Lab</p>
            <p className="mt-1 font-bold text-deep-blue">{lab.name}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500">Your Desk</p>
            <p className="mt-1 font-bold text-electric-blue">
              💺 Desk {booking?.seatNumber ?? '—'}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500">Next Session</p>
            <p className="mt-1 font-bold text-deep-blue">
              {nextSession
                ? `${formatDate(sessionDate(lab, nextSession))}`
                : 'Lab completed! 🎉'}
            </p>
            {nextSession && (
              <p className="text-xs text-gray-400">{lab.schedule}</p>
            )}
          </Card>
        </div>
      </motion.div>

      {/* Course Completion Banner */}
      {(isLabFinished || completedCount >= lab.totalSessions) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 rounded-lab border-2 border-green-300 bg-green-50/90 p-5 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
                🎓
              </span>
              <div>
                <h3 className="font-bold text-deep-blue text-lg">
                  Congratulations, {user.firstName}! Course Completed!
                </h3>
                <p className="text-sm text-gray-600">
                  You have successfully completed all 16 sessions of the curriculum. Your Certificate of Completion is ready.
                </p>
              </div>
            </div>
            <Link href="/certificate" className="shrink-0 w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm">
                View Certificate 🏅
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Experiment progress tracker */}
      <Card className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-deep-blue">
            🧪 Experiment Progress — Day 1 to {lab.totalSessions}
          </h2>
          <p className="text-sm font-semibold text-electric-blue">
            {completedCount} / {lab.totalSessions} sessions
          </p>
        </div>

        {/* Fill bar */}
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-blue-light">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${(completedCount / lab.totalSessions) * 100}%`,
            }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-electric-blue to-green-400"
          />
        </div>

        {/* Session bubbles */}
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.04 }}
          className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-8"
        >
          {sessions.map((session) => {
            const status = sessionStatus(session)
            return (
              <motion.div
                key={session}
                variants={{
                  hidden: { opacity: 0, scale: 0.6 },
                  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
                }}
                className="flex flex-col items-center gap-1"
              >
                {status === 'today' ? (
                  <motion.span
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-electric-blue text-sm font-bold text-lab-white ring-4 ring-electric-blue/30"
                  >
                    {session}
                  </motion.span>
                ) : (
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${
                      status === 'completed'
                        ? 'bg-green-500 text-lab-white'
                        : status === 'missed'
                          ? 'bg-seat-reserved/80 text-lab-white'
                          : 'bg-blue-light text-gray-400'
                    }`}
                  >
                    {status === 'completed' ? '✓' : status === 'missed' ? '✗' : session}
                  </span>
                )}
                <span className="text-[10px] text-gray-400">
                  {sessionDate(lab, session).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </motion.div>
            )
          })}
        </motion.div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>🟢 Completed</span>
          <span>🔴 Missed</span>
          <span>🔵 Today</span>
          <span>⚪ Upcoming</span>
        </div>
      </Card>

      {/* Module completion */}
      <Card className="mt-8">
        <h2 className="font-bold text-deep-blue">🧬 Module Completion</h2>
        <p className="mt-1 text-sm text-gray-500">
          {isLabFinished
            ? `All ${COURSE_MODULES.length} course modules completed!`
            : `${modulesCompleted.length} of ${COURSE_MODULES.length} modules covered in your lab so far.`}
        </p>
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.05 }}
          className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          {COURSE_MODULES.map((module) => {
            const done = isLabFinished || modulesCompleted.includes(module)
            return (
              <motion.div
                key={module}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                }}
                className={`rounded-lab border p-3 text-center text-sm font-medium ${
                  done
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-blue-light bg-lab-white text-gray-400'
                }`}
              >
                {done ? '✅' : '🧪'} {module}
              </motion.div>
            )
          })}
        </motion.div>
      </Card>
    </div>
  )
}
