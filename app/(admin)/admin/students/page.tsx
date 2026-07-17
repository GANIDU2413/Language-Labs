'use client'

import { useEffect, useState } from 'react'
import {
  deleteDocument,
  getCollection,
  queryCollection,
} from '@/lib/firestore'
import { formatDate } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ErrorState from '@/components/ui/ErrorState'
import Input from '@/components/ui/Input'
import { TableSkeleton } from '@/components/ui/Skeleton'
import type { AccountStatus, Booking, Lab, User } from '@/types'

const RETENTION_DAYS = 7

const statusBadge: Record<
  AccountStatus,
  { label: string; variant: 'success' | 'warning' | 'info' }
> = {
  pending: { label: 'Pending', variant: 'warning' },
  active: { label: 'Active', variant: 'info' },
  enrolled: { label: 'Enrolled', variant: 'success' },
}

export default function StudentDetailsPage() {
  const [students, setStudents] = useState<(User & { id: string })[] | null>(
    null
  )
  const [labNames, setLabNames] = useState<Record<string, string>>({})
  const [fetchError, setFetchError] = useState(false)
  const [search, setSearch] = useState('')
  const [cleanupOpen, setCleanupOpen] = useState(false)
  const [cleanupBusy, setCleanupBusy] = useState(false)

  function loadData() {
    setFetchError(false)
    setStudents(null)
    Promise.all([
      queryCollection<User & { id: string }>('users', 'role', '==', 'student'),
      getCollection<Lab>('labs'),
    ])
      .then(([users, labs]) => {
        setStudents(
          users.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
        )
        setLabNames(Object.fromEntries(labs.map((l) => [l.id, l.name])))
      })
      .catch(() => setFetchError(true))
  }

  useEffect(loadData, [])

  const staleStudents = (students ?? []).filter(
    (s) =>
      s.status === 'pending' &&
      Date.now() - s.createdAt.toMillis() > RETENTION_DAYS * 24 * 60 * 60 * 1000
  )

  async function runCleanup() {
    setCleanupBusy(true)
    try {
      let deletedBookings = 0
      for (const student of staleStudents) {
        const bookings = await queryCollection<Booking>(
          'bookings',
          'studentId',
          '==',
          student.id
        )
        for (const booking of bookings) {
          await deleteDocument('bookings', booking.id)
          deletedBookings++
        }
        await deleteDocument('users', student.id)
      }
      setStudents(
        (current) =>
          current?.filter((s) => !staleStudents.some((x) => x.id === s.id)) ??
          null
      )
      setCleanupOpen(false)
      toast.success(
        `Cleanup done — removed ${staleStudents.length} unverified student${staleStudents.length === 1 ? '' : 's'} and ${deletedBookings} booking${deletedBookings === 1 ? '' : 's'}.`
      )
    } catch {
      toast.error('Cleanup failed partway. Run it again to finish.')
      loadData()
    } finally {
      setCleanupBusy(false)
    }
  }

  if (fetchError) {
    return (
      <div className="px-4 py-8 sm:px-8">
        <ErrorState onRetry={loadData} />
      </div>
    )
  }

  if (!students) {
    return (
      <div className="px-4 py-8 sm:px-8">
        <TableSkeleton rows={8} />
      </div>
    )
  }

  const visible = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-deep-blue">
            Student Details 👥
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {students.length} registered student{students.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setCleanupOpen(true)}
          disabled={staleStudents.length === 0}
          title={
            staleStudents.length === 0
              ? 'No unverified students older than 7 days'
              : undefined
          }
        >
          🧹 Run Cleanup ({staleStudents.length})
        </Button>
      </div>

      <div className="mt-6 max-w-sm">
        <Input
          label="Search students"
          name="search"
          placeholder="Name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <Card className="mt-8 max-w-md text-center">
          <p className="text-4xl">🧑‍🎓</p>
          <p className="mt-3 font-semibold text-deep-blue">
            {search ? 'No students match your search' : 'No students yet'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {search
              ? 'Try a different name or email.'
              : 'Students appear here as soon as they register.'}
          </p>
        </Card>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lab bg-lab-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-blue-light text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Lab</th>
                <th className="px-4 py-3 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((student) => {
                const badge = statusBadge[student.status] ?? statusBadge.pending
                return (
                  <tr
                    key={student.id}
                    className="border-b border-blue-light/60"
                  >
                    <td className="px-4 py-3 font-medium text-deep-blue">
                      {student.fullName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{student.email}</td>
                    <td className="px-4 py-3 text-gray-600">{student.phone}</td>
                    <td className="px-4 py-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {student.enrolledLabId
                        ? (labNames[student.enrolledLabId] ?? '—')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(student.createdAt.toDate())}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cleanup confirmation */}
      {cleanupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-blue/60 px-4">
          <Card className="w-full max-w-sm text-center">
            <p className="text-3xl">🧹</p>
            <h3 className="mt-2 font-bold text-deep-blue">
              Delete {staleStudents.length} unverified student
              {staleStudents.length === 1 ? '' : 's'}?
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              This removes students who registered more than {RETENTION_DAYS}{' '}
              days ago but never verified their email, along with any bookings
              they made. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setCleanupOpen(false)}
                disabled={cleanupBusy}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={cleanupBusy}
                onClick={runCleanup}
              >
                Yes, Clean Up
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
