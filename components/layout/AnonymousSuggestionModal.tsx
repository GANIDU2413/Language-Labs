'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toast } from '@/hooks/useToast'
import Button from '@/components/ui/Button'

interface AnonymousSuggestionModalProps {
  isOpen: boolean
  onClose: () => void
}

const CATEGORIES = [
  'General Feedback',
  'New Lab Sessions & Timings',
  'Course Content & Speaking',
  'Website & Resources',
  'Other',
]

export default function AnonymousSuggestionModal({
  isOpen,
  onClose,
}: AnonymousSuggestionModalProps) {
  const [suggestion, setSuggestion] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Handle escape key and body scroll lock
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = suggestion.trim()
    if (!trimmed) {
      setError('Please enter your suggestion before submitting.')
      return
    }
    if (trimmed.length < 5) {
      setError('Please provide at least 5 characters.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await addDoc(collection(db, 'suggestions'), {
        suggestion: trimmed,
        category,
        createdAt: serverTimestamp(),
      })
      toast.success('Thank you! Your suggestion has been submitted anonymously.')
      setSuggestion('')
      setCategory(CATEGORIES[0])
      onClose()
    } catch (err) {
      console.error('Failed to submit suggestion:', err)
      toast.error('Could not submit suggestion. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-deep-blue/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="suggestion-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 flex w-full max-w-lg flex-col rounded-lab border border-blue-light bg-lab-white p-6 shadow-2xl sm:p-8"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-blue-light/70 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-light text-2xl shadow-xs">
                  💡
                </span>
                <div>
                  <h2
                    id="suggestion-modal-title"
                    className="text-lg font-bold text-deep-blue sm:text-xl"
                  >
                    Anonymous Suggestion Box
                  </h2>
                  <p className="text-xs text-gray-500">
                    No names, no emails — 100% anonymous.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-blue-light hover:text-deep-blue"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <p className="mt-4 text-xs leading-relaxed text-gray-600 sm:text-sm">
              Have an idea, request, or feedback on how we can improve Language
              Labs? Let our team know below.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Category selector */}
              <div>
                <label className="block text-xs font-semibold text-deep-blue sm:text-sm">
                  Topic / Category
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        category === cat
                          ? 'bg-electric-blue text-white shadow-xs'
                          : 'border border-blue-light bg-white text-gray-600 hover:bg-blue-light/60'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-xs font-semibold text-deep-blue sm:text-sm">
                  Your Suggestion
                </label>
                <textarea
                  rows={4}
                  value={suggestion}
                  onChange={(e) => {
                    setSuggestion(e.target.value)
                    if (error) setError('')
                  }}
                  maxLength={1000}
                  placeholder="Share your thoughts or feedback here..."
                  className="mt-1.5 w-full rounded-lab border border-gray-300 p-3 text-sm text-deep-blue placeholder-gray-400 outline-none transition focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/20"
                />
                <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                  <span>{error ? <span className="text-seat-reserved">{error}</span> : 'Constructive feedback is welcomed!'}</span>
                  <span>{suggestion.length}/1000</span>
                </div>
              </div>

              {/* Privacy badge */}
              <div className="flex items-center gap-2 rounded-lab bg-blue-light/50 px-3 py-2 text-[11px] text-gray-600 sm:text-xs">
                <span>🔒</span>
                <span>Your submission is completely anonymous and will be reviewed by the admin.</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={submitting}
                  className="bg-electric-blue hover:bg-electric-blue/90"
                >
                  Submit Suggestion 🚀
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
