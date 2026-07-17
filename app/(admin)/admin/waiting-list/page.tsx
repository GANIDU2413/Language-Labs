'use client'

import { useEffect, useState } from 'react'
import { deleteDocument, getCollection } from '@/lib/firestore'
import { formatDate, getWhatsAppLink } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { TableSkeleton } from '@/components/ui/Skeleton'
import type { WaitingListEntry } from '@/types'

const WAITING_LIST_LIMIT = 12

export default function AdminWaitingListPage() {
  const [entries, setEntries] = useState<WaitingListEntry[] | null>(null)
  const [deleting, setDeleting] = useState<WaitingListEntry | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getCollection<WaitingListEntry>('waitingList')
      .then((all) =>
        // Oldest first — they've been waiting the longest
        setEntries(all.sort((a, b) => a.joinedAt.toMillis() - b.joinedAt.toMillis()))
      )
      .catch(() => setEntries([]))
  }, [])

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    setError('')
    try {
      await deleteDocument('waitingList', deleting.id)
      setEntries((current) => current?.filter((e) => e.id !== deleting.id) ?? null)
      setDeleting(null)
    } catch {
      setError('Delete failed. Please try again.')
    } finally {
      setDeleteBusy(false)
    }
  }

  if (!entries) {
    return (
      <div className="px-4 py-8 sm:px-8">
        <TableSkeleton rows={6} />
      </div>
    )
  }

  return (
    <div className="px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-deep-blue">Waiting List ⏳</h1>
          <p className="mt-1 text-sm text-gray-500">
            These students get an automatic email whenever a new lab opens.
          </p>
        </div>
        <Badge variant={entries.length >= WAITING_LIST_LIMIT ? 'danger' : 'info'}>
          {entries.length} / {WAITING_LIST_LIMIT} students on waiting list
        </Badge>
      </div>

      {error && (
        <p className="mt-4 max-w-xl rounded-lab bg-red-50 px-4 py-3 text-sm text-seat-reserved">
          {error}
        </p>
      )}

      {entries.length === 0 ? (
        <Card className="mt-10 max-w-md text-center">
          <p className="text-4xl">📭</p>
          <p className="mt-3 font-semibold text-deep-blue">
            The waiting list is empty
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Students can join it from the Available Labs page when no seats are
            open.
          </p>
        </Card>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lab bg-lab-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-blue-light text-gray-500">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">WhatsApp</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Notified</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id} className="border-b border-blue-light/60">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-deep-blue">
                    {entry.fullName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{entry.email}</td>
                  <td className="px-4 py-3 text-gray-600">{entry.phone}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(entry.joinedAt.toDate())}
                  </td>
                  <td className="px-4 py-3">
                    {entry.notified ? (
                      <Badge variant="success">Emailed</Badge>
                    ) : (
                      <Badge variant="warning">Waiting</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <a
                        href={getWhatsAppLink(
                          entry.phone,
                          `Hi ${entry.fullName}! This is Language Labs — thanks for joining our waiting list.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 items-center gap-1.5 rounded-lab bg-[#25D366] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#1EBE5D]"
                      >
                        💬 WhatsApp
                      </a>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setDeleting(entry)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-blue/60 px-4">
          <Card className="w-full max-w-sm text-center">
            <p className="text-3xl">🗑️</p>
            <h3 className="mt-2 font-bold text-deep-blue">
              Remove {deleting.fullName}?
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              They will no longer receive new-lab notifications. This frees a
              spot on the waiting list.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setDeleting(null)}
                disabled={deleteBusy}
              >
                Cancel
              </Button>
              <Button variant="danger" loading={deleteBusy} onClick={confirmDelete}>
                Yes, Remove
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
