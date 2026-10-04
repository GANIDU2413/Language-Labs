'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { deleteDocument } from '@/lib/firestore'
import { formatDate } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Suggestion } from '@/types'

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [deletingItem, setDeletingItem] = useState<Suggestion | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  // Real-time listener for incoming suggestions (newest first)
  useEffect(() => {
    const q = query(collection(db, 'suggestions'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Suggestion[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Suggestion, 'id'>),
        }))
        setSuggestions(list)
        setLoading(false)
      },
      (error) => {
        console.error('Error fetching suggestions:', error)
        toast.error('Failed to load suggestions. Please check connection.')
        setLoading(false)
      }
    )

    return unsubscribe
  }, [])

  // Extract all distinct categories
  const categories = useMemo(() => {
    if (!suggestions) return []
    const set = new Set<string>()
    suggestions.forEach((s) => {
      if (s.category) set.add(s.category)
    })
    return Array.from(set)
  }, [suggestions])

  // Filter suggestions by search query and category
  const filteredSuggestions = useMemo(() => {
    if (!suggestions) return []
    return suggestions.filter((s) => {
      const matchesCategory =
        selectedCategory === 'all' || s.category === selectedCategory
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        s.suggestion.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q))
      return matchesCategory && matchesSearch
    })
  }, [suggestions, selectedCategory, searchQuery])

  // Confirm delete handler
  async function confirmDelete() {
    if (!deletingItem) return
    setDeleteBusy(true)
    try {
      await deleteDocument('suggestions', deletingItem.id)
      toast.success('Suggestion deleted successfully.')
      setDeletingItem(null)
    } catch (err) {
      console.error('Failed to delete suggestion:', err)
      toast.error('Could not delete suggestion. Please try again.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="px-4 py-8 sm:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-deep-blue">
              Anonymous Suggestions 💡
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Feedback, suggestions, and ideas submitted anonymously by website visitors and students.
          </p>
        </div>

        {suggestions && (
          <Badge variant="info">
            {suggestions.length} {suggestions.length === 1 ? 'Suggestion' : 'Suggestions'} Total
          </Badge>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              selectedCategory === 'all'
                ? 'bg-electric-blue text-white shadow-xs'
                : 'border border-blue-light bg-white text-gray-600 hover:bg-blue-light/50'
            }`}
          >
            All ({suggestions?.length ?? 0})
          </button>
          {categories.map((cat) => {
            const count = suggestions?.filter((s) => s.category === cat).length ?? 0
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-electric-blue text-white shadow-xs'
                    : 'border border-blue-light bg-white text-gray-600 hover:bg-blue-light/50'
                }`}
              >
                {cat} ({count})
              </button>
            )
          })}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search suggestions..."
            className="w-full rounded-lab border border-gray-300 px-3.5 py-2 text-xs text-deep-blue placeholder-gray-400 outline-none transition focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/20"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lab border border-blue-light bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="mt-4 h-16 w-full" />
            </div>
          ))}
        </div>
      ) : suggestions?.length === 0 ? (
        <Card className="mt-10 max-w-md text-center mx-auto py-12">
          <p className="text-4xl">📭</p>
          <h2 className="mt-3 font-bold text-deep-blue">No suggestions received yet</h2>
          <p className="mt-1 text-sm text-gray-500">
            When visitors submit ideas via the &quot;Submit&quot; card on the homepage, their feedback will appear here.
          </p>
        </Card>
      ) : filteredSuggestions.length === 0 ? (
        <Card className="mt-10 max-w-md text-center mx-auto py-10">
          <p className="text-3xl">🔍</p>
          <p className="mt-2 font-semibold text-deep-blue">No matching suggestions</p>
          <p className="mt-1 text-xs text-gray-500">
            Try adjusting your search query or category filter.
          </p>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredSuggestions.map((item, index) => {
            const formattedDate = item.createdAt?.toDate
              ? formatDate(item.createdAt.toDate())
              : 'Recently submitted'

            return (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-[16px] border border-blue-light/80 bg-white p-5 shadow-xs transition-all hover:border-electric-blue/40 hover:shadow-md sm:p-6"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-light text-xs font-bold text-electric-blue">
                      #{index + 1}
                    </span>
                    <span className="rounded-full bg-blue-light px-3 py-0.5 text-xs font-bold text-electric-blue">
                      {item.category || 'General Feedback'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">
                      📅 {formattedDate}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeletingItem(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/50 px-3 py-1 text-xs font-semibold text-seat-reserved transition hover:bg-seat-reserved hover:text-white"
                      title="Permanently delete this suggestion"
                    >
                      <span>🗑️</span>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Suggestion body */}
                <div className="mt-4 rounded-xl bg-blue-light/20 p-4 text-sm leading-relaxed text-deep-blue sm:text-base whitespace-pre-wrap">
                  {item.suggestion}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleteBusy && setDeletingItem(null)}
              className="fixed inset-0 bg-deep-blue/60 backdrop-blur-xs"
              aria-hidden="true"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-md rounded-lab border border-seat-reserved/30 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-xl text-seat-reserved">
                  ⚠️
                </span>
                <div>
                  <h3 className="text-base font-bold text-deep-blue">
                    Permanently Delete Suggestion?
                  </h3>
                  <p className="text-xs text-gray-500">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 line-clamp-3 italic border border-gray-100">
                &ldquo;{deletingItem.suggestion}&rdquo;
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDeletingItem(null)}
                  disabled={deleteBusy}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmDelete}
                  loading={deleteBusy}
                  className="bg-seat-reserved hover:bg-seat-reserved/90"
                >
                  Yes, Delete Permanently
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
