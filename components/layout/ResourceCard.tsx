'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import type { ResourceType } from '@/types'
import type { CardColor } from '@/lib/resourceStyles'

interface ResourceCardProps {
  title: string
  description?: string
  type: ResourceType
  /** PDF file URL or YouTube link, depending on type */
  url?: string
  /** Inline content for text posts */
  content?: string
  /** Dynamic thumbnail character image from /images/mini-images/ */
  thumbnailImage?: string
  /** Dynamic card background color from CourseOverview courseCards */
  cardColor?: CardColor
}

const typeIcon: Record<ResourceType, string> = {
  pdf: '📄',
  youtube: '▶️',
  text: '📝',
}

const typeAction: Record<ResourceType, string> = {
  pdf: 'Download',
  youtube: 'Watch',
  text: 'View',
}

// Fallback color if none provided
const defaultColor: CardColor = { hex: '#2563EB', rgb: '37,99,235' }

export default function ResourceCard({
  title,
  description,
  type,
  url,
  content,
  thumbnailImage,
  cardColor = defaultColor,
}: ResourceCardProps) {
  const [modalOpen, setModalOpen] = useState(false)

  // Close modal on Escape key and prevent background body scrolling while open
  useEffect(() => {
    if (!modalOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [modalOpen])

  // Frosted pill button styling from CourseOverview.tsx (compact & responsive)
  const actionBtnClass =
    'w-full flex items-center justify-center rounded-full border border-white/40 py-1.5 sm:py-2 px-2 sm:px-3 text-[10px] sm:text-xs md:text-sm font-bold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-white/25 shadow-sm'

  const actionBtnStyle = {
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    cursor: 'pointer',
  }

  return (
    <>
      <div
        className="group relative flex h-full w-[85%] min-h-[170px] sm:min-h-[220px] md:min-h-[255px] mx-auto flex-col justify-between overflow-hidden rounded-[14px] sm:rounded-[16px] border-2 border-[rgba(255,255,255,0.45)] px-2.5 py-2.5 sm:px-3.5 sm:py-4 md:px-5 md:py-5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
        style={{
          background: `rgba(${cardColor.rgb},0.85)`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Top Section: Side-by-side row with emoji, topic & description on left, thumbnail image on right */}
        <div className="flex flex-1 items-start justify-between gap-1.5 sm:gap-2.5 md:gap-3">
          {/* Left Content Column */}
          <div className="flex flex-1 min-w-0 flex-col">
            {/* Top Icon Badge */}
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 items-center justify-center rounded-full border border-white/30 bg-white/20 text-xs sm:text-sm md:text-base text-white shadow-xs backdrop-blur-xs">
              {typeIcon[type]}
            </span>

            {/* Title / Topic */}
            <h3 className="mt-1 sm:mt-1.5 md:mt-2 font-bold text-white text-[11px] sm:text-sm md:text-base leading-tight sm:leading-snug drop-shadow-xs line-clamp-2">
              {title}
            </h3>

            {/* Description */}
            {description && (
              <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs md:text-sm text-white/90 leading-tight sm:leading-relaxed drop-shadow-xs line-clamp-2">
                {description}
              </p>
            )}
          </div>

          {/* Right Column: Thumbnail Image parallel to emoji, topic, and description (scaled larger) */}
          {thumbnailImage && (
            <div className="relative h-[98px] w-12 sm:h-[118px] sm:w-16 md:h-[136px] md:w-20 shrink-0 self-center transition-transform duration-300 group-hover:scale-105">
              <Image
                src={thumbnailImage}
                alt=""
                fill
                sizes="(max-width: 640px) 48px, (max-width: 1024px) 64px, 80px"
                className="object-contain object-center drop-shadow-md select-none pointer-events-none"
              />
            </div>
          )}
        </div>

        {/* Bottom Area: Full-width Action Button styled like CourseOverview */}
        <div className="mt-2 sm:mt-3 w-full">
          {type === 'text' ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={actionBtnClass}
              style={actionBtnStyle}
            >
              {typeAction.text}
            </button>
          ) : (
            url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={actionBtnClass}
                style={actionBtnStyle}
              >
                {typeAction[type]}
              </a>
            )
          )}
        </div>
      </div>

      {/* Modal Popup for Text Post Details */}
      <AnimatePresence>
        {modalOpen && type === 'text' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 bg-deep-blue/60 backdrop-blur-xs"
              aria-hidden="true"
            />

            {/* Modal Dialog Card */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-post-topic"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 flex w-full max-w-xl max-h-[85vh] flex-col rounded-lab border border-blue-light bg-lab-white p-6 shadow-2xl sm:p-8"
            >
              {/* Header with Title and Close X Button */}
              <div className="flex items-start justify-between gap-4 border-b border-blue-light/70 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-light text-xl">
                    📝
                  </span>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-electric-blue">
                      Topic
                    </span>
                    <h2
                      id="modal-post-topic"
                      className="text-lg font-bold text-deep-blue sm:text-xl"
                    >
                      {title}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="Close modal"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-blue-light hover:text-deep-blue"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body Content */}
              <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
                {/* Description */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Description
                  </span>
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                    {description || 'No description provided.'}
                  </p>
                </div>

                {/* Full Post Content */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Full Post Content
                  </span>
                  <div className="mt-1.5 whitespace-pre-line rounded-lab bg-blue-light/40 p-4 text-sm leading-relaxed text-deep-blue border border-blue-light/60">
                    {content || 'No content provided.'}
                  </div>
                </div>
              </div>

              {/* Footer with OK and Close buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-blue-light/70 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lab border border-gray-300 bg-lab-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lab bg-electric-blue px-6 py-2.5 text-sm font-semibold text-lab-white transition-colors hover:bg-electric-blue/90 shadow-sm"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
