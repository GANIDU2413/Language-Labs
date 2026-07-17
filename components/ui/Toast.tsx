'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { dismissToast, useToasts, type ToastVariant } from '@/hooks/useToast'

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-green-600',
  error: 'bg-seat-reserved',
  info: 'bg-electric-blue',
}

const variantIcons: Record<ToastVariant, string> = {
  success: '✅',
  error: '⚠️',
  info: 'ℹ️',
}

/** Global toast outlet — mounted once in the root layout */
export default function Toaster() {
  const toasts = useToasts()

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-4 z-[110] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:left-auto sm:right-4 sm:translate-x-0 sm:px-0"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            onClick={() => dismissToast(t.id)}
            className={`pointer-events-auto flex items-start gap-2 rounded-lab px-4 py-3 text-left text-sm font-medium text-lab-white shadow-lg ${variantClasses[t.variant]}`}
          >
            <span aria-hidden>{variantIcons[t.variant]}</span>
            <span className="flex-1">{t.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
