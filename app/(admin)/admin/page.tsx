'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getCollection, queryCollection } from '@/lib/firestore'
import Card from '@/components/ui/Card'
import type {
  InClassTest,
  Lab,
  Resource,
  TestResult,
  User,
  WaitingListEntry,
} from '@/types'

interface DashboardCounts {
  students: number
  upcomingLabs: number
  ongoingLabs: number
  resources: number
  unreviewed: number
  inClassTests: number
  waitingList: number
}

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null)

  useEffect(() => {
    Promise.all([
      queryCollection<User>('users', 'role', '==', 'student'),
      getCollection<Lab>('labs'),
      getCollection<Resource>('resources'),
      queryCollection<TestResult>('testResults', 'reviewedByAdmin', '==', false),
      getCollection<InClassTest>('inClassTests'),
      getCollection<WaitingListEntry>('waitingList'),
    ])
      .then(([students, labs, resources, unreviewed, inClassTests, waiting]) =>
        setCounts({
          students: students.length,
          upcomingLabs: labs.filter((l) => l.status === 'notStarted').length,
          ongoingLabs: labs.filter((l) => l.status === 'ongoing').length,
          resources: resources.length,
          unreviewed: unreviewed.length,
          inClassTests: inClassTests.length,
          waitingList: waiting.length,
        })
      )
      .catch(() =>
        setCounts({
          students: 0,
          upcomingLabs: 0,
          ongoingLabs: 0,
          resources: 0,
          unreviewed: 0,
          inClassTests: 0,
          waitingList: 0,
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
      status: `${counts.upcomingLabs} lab${counts.upcomingLabs === 1 ? '' : 's'} not started`,
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
      status: `${counts.unreviewed} pending review`,
      highlight: counts.unreviewed > 0,
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
  ]

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-deep-blue">Lab Control Panel</h1>
      <p className="mt-1 text-sm text-gray-500">
        Everything happening in your lab, at a glance.
      </p>

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
                  className={`flex h-full items-center gap-4 transition-shadow hover:shadow-md ${
                    card.highlight ? 'border-2 border-seat-reserved' : ''
                  }`}
                >
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
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
