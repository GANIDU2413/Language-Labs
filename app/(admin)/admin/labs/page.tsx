'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { deleteDocument, getCollection, queryCollection } from '@/lib/firestore'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { CardGridSkeleton } from '@/components/ui/Skeleton'
import type { Booking, Lab, LabStatus } from '@/types'

const tabs: { value: LabStatus; label: string }[] = [
  { value: 'notStarted', label: 'Not Started' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
]

function enrolledCount(lab: Lab): number {
  return lab.seats?.filter((s) => s.status !== 'available').length ?? 0
}

function LabsContent() {
  const tabParam = useSearchParams().get('tab')
  const [tab, setTab] = useState<LabStatus>(
    tabs.some((t) => t.value === tabParam) ? (tabParam as LabStatus) : 'notStarted'
  )
  const [labs, setLabs] = useState<Lab[] | null>(null)
  const [deleting, setDeleting] = useState<Lab | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    getCollection<Lab>('labs')
      .then((all) =>
        setLabs(
          all.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
        )
      )
      .catch(() => setLabs([]))
  }, [])

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError('')
    try {
      // Business rule: never delete a lab that has any bookings
      const bookings = await queryCollection<Booking>(
        'bookings',
        'labId',
        '==',
        deleting.id
      )
      if (bookings.length > 0) {
        setDeleteError(
          `Cannot delete — ${bookings.length} booking${bookings.length === 1 ? '' : 's'} exist for this lab.`
        )
        return
      }
      await deleteDocument('labs', deleting.id)
      setLabs((current) => current?.filter((l) => l.id !== deleting.id) ?? null)
      setDeleting(null)
    } catch {
      setDeleteError('Delete failed. Please try again.')
    } finally {
      setDeleteBusy(false)
    }
  }

  if (!labs) {
    return (
      <div className="mt-6">
        <CardGridSkeleton
          count={4}
          cardClassName="h-44"
          gridClassName="grid-cols-1 lg:grid-cols-2"
        />
      </div>
    )
  }

  const visible = labs.filter((lab) => lab.status === tab)

  return (
    <>
      {/* Tabs */}
      <div className="mt-6 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-lab px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.value
                ? 'bg-electric-blue text-lab-white'
                : 'bg-lab-white text-gray-600 hover:bg-blue-light'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Lab cards */}
      {visible.length === 0 ? (
        <p className="mt-12 text-center text-gray-500">
          No {tabs.find((t) => t.value === tab)?.label.toLowerCase()} labs.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visible.map((lab) => {
            const students = enrolledCount(lab)
            const canEdit = lab.status === 'notStarted' && students === 0
            const canDelete = lab.status === 'completed'
            return (
              <Card key={lab.id}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-bold text-deep-blue">
                    {lab.name}
                  </h2>
                  <Badge
                    variant={
                      lab.status === 'ongoing'
                        ? 'success'
                        : lab.status === 'completed'
                          ? 'warning'
                          : 'info'
                    }
                  >
                    {tabs.find((t) => t.value === lab.status)?.label}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-col gap-1 text-sm text-gray-600">
                  <p>📅 Starts {formatDate(lab.startDate.toDate())}</p>
                  {lab.duration && <p>⏱️ {lab.duration}</p>}
                  <p>🕕 {lab.schedule}</p>
                  <p className="font-semibold text-deep-blue">
                    👥 {students} / 6 students
                  </p>
                </div>
                {(canEdit || canDelete) && (
                  <div className="mt-4 flex gap-3">
                    {canEdit && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        title="Lab editing is coming soon"
                      >
                        Edit
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setDeleteError('')
                          setDeleting(lab)
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-blue/60 px-4">
          <Card className="w-full max-w-sm text-center">
            <p className="text-3xl">🗑️</p>
            <h3 className="mt-2 font-bold text-deep-blue">
              Delete {deleting.name}?
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              This permanently removes the lab. This action cannot be undone.
            </p>
            {deleteError && (
              <p className="mt-3 rounded-lab bg-red-50 px-4 py-3 text-sm text-seat-reserved">
                {deleteError}
              </p>
            )}
            <div className="mt-5 flex justify-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setDeleting(null)}
                disabled={deleteBusy}
              >
                Cancel
              </Button>
              <Button variant="danger" loading={deleteBusy} onClick={confirmDelete}>
                Yes, Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

export default function AdminLabsPage() {
  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-deep-blue">Labs</h1>
      <p className="mt-1 text-sm text-gray-500">
        All lab batches by status.
      </p>
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <LabsContent />
      </Suspense>
    </div>
  )
}
