'use client'

import { useEffect, useState } from 'react'
import {
  getCollection,
  purgeStudentData,
  queryCollection,
  setStudentDisabled,
} from '@/lib/firestore'
import { formatDate } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ErrorState from '@/components/ui/ErrorState'
import Input from '@/components/ui/Input'
import { TableSkeleton } from '@/components/ui/Skeleton'
import type { AccountStatus, Lab, User } from '@/types'

const RETENTION_DAYS = 7

const statusBadge: Record<
  AccountStatus,
  { label: string; variant: 'success' | 'warning' | 'info' | 'danger' }
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

  // Disable / Enable state
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'disable' | 'enable' | null>(null)

  // Delete modal state
  const [deletingStudent, setDeletingStudent] = useState<(User & { id: string }) | null>(null)
  const [deleteStudentBusy, setDeleteStudentBusy] = useState(false)

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

  async function handleToggleDisable(student: User & { id: string }, newDisabledState: boolean) {
    setActionBusyId(student.id)
    setActionType(newDisabledState ? 'disable' : 'enable')
    try {
      await setStudentDisabled(student.id, newDisabledState)
      setStudents((current) =>
        current?.map((s) =>
          s.id === student.id
            ? { ...s, disabled: newDisabledState }
            : s
        ) ?? null
      )
      toast.success(
        newDisabledState
          ? `${student.fullName}'s access has been disabled.`
          : `${student.fullName}'s access has been enabled.`
      )
    } catch {
      toast.error(
        `Could not ${newDisabledState ? 'disable' : 'enable'} account. Please try again.`
      )
    } finally {
      setActionBusyId(null)
      setActionType(null)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingStudent) return
    setDeleteStudentBusy(true)
    try {
      const res = await purgeStudentData(deletingStudent.id, deletingStudent.email)
      if (!res.success) {
        throw new Error(res.error || 'Failed to purge student data')
      }
      setStudents((current) =>
        current?.filter((s) => s.id !== deletingStudent.id) ?? null
      )
      toast.success(
        `${deletingStudent.fullName} and all associated data were permanently deleted.`
      )
      setDeletingStudent(null)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Could not delete student. Please try again.'
      toast.error(message)
    } finally {
      setDeleteStudentBusy(false)
    }
  }

  async function runCleanup() {
    setCleanupBusy(true)
    try {
      for (const student of staleStudents) {
        await purgeStudentData(student.id, student.email)
      }
      setStudents((current) =>
        current?.filter((s) => !staleStudents.some((x) => x.id === s.id)) ?? null
      )
      setCleanupOpen(false)
      toast.success(
        `Cleanup done — completely purged ${staleStudents.length} unverified student${staleStudents.length === 1 ? '' : 's'}.`
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
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-blue-light text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Lab</th>
                <th className="px-4 py-3 font-medium">Registered</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((student) => {
                const badge = statusBadge[student.status] ?? statusBadge.pending
                const isBusy = actionBusyId === student.id
                return (
                  <tr
                    key={student.id}
                    className="border-b border-blue-light/60 transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-3 font-medium text-deep-blue">
                      {student.fullName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{student.email}</td>
                    <td className="px-4 py-3 text-gray-600">{student.phone}</td>
                    <td className="px-4 py-3">
                      {student.disabled ? (
                        <Badge variant="danger">Disabled</Badge>
                      ) : (
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {student.enrolledLabId
                        ? (labNames[student.enrolledLabId] ?? '—')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(student.createdAt.toDate())}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {student.disabled ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="border-green-300 text-green-700 hover:bg-green-50"
                            onClick={() => handleToggleDisable(student, false)}
                            disabled={isBusy || deleteStudentBusy}
                            loading={isBusy && actionType === 'enable'}
                          >
                            Enable
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={() => handleToggleDisable(student, true)}
                            disabled={isBusy || deleteStudentBusy}
                            loading={isBusy && actionType === 'disable'}
                          >
                            Disable
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setDeletingStudent(student)}
                          disabled={isBusy || deleteStudentBusy}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-blue/60 px-4">
          <Card className="w-full max-w-md text-left">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-xl">
                ⚠️
              </span>
              <div>
                <h3 className="text-lg font-bold text-deep-blue">
                  Delete Student Account?
                </h3>
                <p className="text-xs text-gray-500">
                  Permanent removal across all services
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lab bg-red-50 p-3 text-xs leading-relaxed text-seat-reserved">
              Are you sure you want to permanently delete{' '}
              <strong className="font-bold">{deletingStudent.fullName}</strong> ({deletingStudent.email})?
              This action cannot be undone.
            </div>

            <p className="mt-3 text-xs font-semibold text-gray-600">
              This will completely purge:
            </p>
            <ul className="mt-1 space-y-1 text-xs text-gray-500 list-disc list-inside">
              <li>Firebase Auth user credentials and login account</li>
              <li>Student profile and database records</li>
              <li>Lab enrollments and seat reservations (freed for other students)</li>
              <li>All booking and payment transaction records</li>
              <li>Waiting list registrations</li>
              <li>Level test results and speaking audio recordings</li>
              <li>In-class quiz submissions and marks</li>
              <li>Attendance tracking Day 1–16</li>
            </ul>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setDeletingStudent(null)}
                disabled={deleteStudentBusy}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={deleteStudentBusy}
                onClick={handleConfirmDelete}
              >
                Permanently Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Stale unverified cleanup confirmation */}
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
              days ago but never verified their email, along with all associated
              records. This cannot be undone.
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
