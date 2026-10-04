'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getCollection, queryCollection } from '@/lib/firestore'
import Card from '@/components/ui/Card'
import type {
  InClassTest,
  Lab,
  Resource,
  Suggestion,
  User,
  WaitingListEntry,
} from '@/types'

interface DashboardCounts {
  students: number
  upcomingLabs: number
  ongoingLabs: number
  resources: number
  inClassTests: number
  waitingList: number
  suggestions: number
}

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null)
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0)
  const [unreviewedCount, setUnreviewedCount] = useState(0)

  // Live query for pending payments
  useEffect(() => {
    const q = query(
      collection(db, 'bookings'),
      where('paymentStatus', '==', 'pending')
    )
    const unsubscribe = onSnapshot(q, (snap) => {
      setPendingPaymentsCount(snap.size)
    })
    return unsubscribe
  }, [])

  // Live query for unreviewed speaking tests
  useEffect(() => {
    const q = query(
      collection(db, 'testResults'),
      where('reviewedByAdmin', '==', false)
    )
    const unsubscribe = onSnapshot(q, (snap) => {
      setUnreviewedCount(snap.size)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    Promise.all([
      queryCollection<User>('users', 'role', '==', 'student'),
      getCollection<Lab>('labs'),
      getCollection<Resource>('resources'),
      getCollection<InClassTest>('inClassTests'),
      getCollection<WaitingListEntry>('waitingList'),
      getCollection<Suggestion>('suggestions'),
    ])
      .then(([students, labs, resources, inClassTests, waiting, suggestions]) =>
        setCounts({
          students: students.length,
          upcomingLabs: labs.filter((l) => l.status === 'notStarted').length,
          ongoingLabs: labs.filter((l) => l.status === 'ongoing').length,
          resources: resources.length,
          inClassTests: inClassTests.length,
          waitingList: waiting.length,
          suggestions: suggestions.length,
        })
      )
      .catch(() =>
        setCounts({
          students: 0,
          upcomingLabs: 0,
          ongoingLabs: 0,
          resources: 0,
          inClassTests: 0,
          waitingList: 0,
          suggestions: 0,
        })
      )
  }, [])

  const cards = counts && [
    {
      href: '/admin/students',
      icon: '👥',
      label: 'Student Details',
      status: `${counts.students} registered student${counts.students === 1 ? '' : 's'}`,
    },
    {
      href: '/admin/labs/new',
      icon: '➕',
      label: 'New Lab Creation',
      status: 'Create a new lab batch',
    },
    {
      href: '/admin/labs/not-started',
      icon: '🧪',
      label: 'New Labs',
      status:
        pendingPaymentsCount > 0
          ? `${pendingPaymentsCount} payment${pendingPaymentsCount === 1 ? '' : 's'} pending review`
          : `${counts.upcomingLabs} lab${counts.upcomingLabs === 1 ? '' : 's'} not started`,
      highlight: pendingPaymentsCount > 0,
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : undefined,
    },
    {
      href: '/admin/labs/ongoing',
      icon: '⚗️',
      label: 'Ongoing Labs',
      status: `${counts.ongoingLabs} lab${counts.ongoingLabs === 1 ? '' : 's'} in progress`,
    },
    {
      href: '/admin/attendance',
      icon: '📋',
      label: 'Attendance',
      status: 'Mark session attendance',
    },
    {
      href: '/admin/resources',
      icon: '📁',
      label: 'Upload Resources',
      status: `${counts.resources} resource${counts.resources === 1 ? '' : 's'} uploaded`,
    },
    {
      href: '/admin/test-materials',
      icon: '📝',
      label: 'Tests Materials',
      status: 'Manage level test content',
    },
    {
      href: '/admin/speaking-review',
      icon: '🎙️',
      label: 'Review Speaking Tests',
      status:
        unreviewedCount > 0
          ? `${unreviewedCount} pending review`
          : 'All tests reviewed',
      highlight: unreviewedCount > 0,
      badge: unreviewedCount > 0 ? unreviewedCount : undefined,
    },
    {
      href: '/admin/inclass-test',
      icon: '⏱️',
      label: 'In-Class Test',
      status: `${counts.inClassTests} test${counts.inClassTests === 1 ? '' : 's'} created`,
    },
    {
      href: '/admin/waiting-list',
      icon: '⏳',
      label: 'Waiting List',
      status: `${counts.waitingList} on waiting list`,
    },
    {
      href: '/admin/suggestions',
      icon: '💡',
      label: 'Anonymous Suggestions',
      status: `${counts.suggestions} suggestion${counts.suggestions === 1 ? '' : 's'} received`,
    },
  ]

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-deep-blue">Lab Control Panel</h1>
      <p className="mt-1 text-sm text-gray-500">
        Everything happening in your lab, at a glance.
      </p>

      {/* Alert banner for pending student payments */}
      {pendingPaymentsCount > 0 && (
        <div className="mt-6 flex flex-col gap-3 rounded-lab border-2 border-seat-reserved bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-seat-reserved text-lg font-bold text-lab-white">
              {pendingPaymentsCount}
            </span>
            <div>
              <p className="font-bold text-deep-blue">
                {pendingPaymentsCount === 1
                  ? '1 Student Payment Waiting for Verification'
                  : `${pendingPaymentsCount} Student Payments Waiting for Verification`}
              </p>
              <p className="text-xs text-gray-600">
                New payment receipt(s) submitted. Verify bank transfers in New Labs to reserve desks and unlock student dashboards.
              </p>
            </div>
          </div>
          <Link
            href="/admin/labs/not-started"
            className="inline-flex shrink-0 items-center justify-center rounded-lab bg-seat-reserved px-4 py-2 text-xs font-bold text-lab-white transition-colors hover:bg-seat-reserved/90"
          >
            Review Payments →
          </Link>
        </div>
      )}

      {!cards ? (
        <div className="mt-8 grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lab bg-blue-light" />
          ))}
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.05 }}
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {cards.map((card) => (
            <motion.div
              key={card.href}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
              }}
            >
              <Link href={card.href}>
                <Card
                  className={`flex h-full items-center justify-between gap-4 transition-all hover:shadow-md ${
                    card.highlight
                      ? 'border-2 border-seat-reserved ring-1 ring-seat-reserved/20'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-light text-2xl">
                      {card.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-deep-blue">{card.label}</p>
                      <p
                        className={`mt-0.5 text-sm ${
                          card.highlight
                            ? 'font-semibold text-seat-reserved'
                            : 'text-gray-500'
                        }`}
                      >
                        {card.status}
                      </p>
                    </div>
                  </div>
                  {card.badge !== undefined && card.badge > 0 && (
                    <span className="shrink-0 rounded-full bg-seat-reserved px-2.5 py-0.5 text-xs font-bold text-lab-white shadow-sm">
                      {card.badge}
                    </span>
                  )}
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
