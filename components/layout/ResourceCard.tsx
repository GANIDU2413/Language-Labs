'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ResourceType } from '@/types'

interface ResourceCardProps {
  title: string
  description?: string
  type: ResourceType
  /** PDF file URL or YouTube link, depending on type */
  url?: string
  /** Inline content for text posts */
  content?: string
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

export default function ResourceCard({
  title,
  description,
  type,
  url,
  content,
}: ResourceCardProps) {
  const [expanded, setExpanded] = useState(false)

  const actionClass =
    'mt-4 inline-block rounded-lab bg-electric-blue px-5 py-2 text-sm font-semibold text-lab-white transition-colors hover:bg-electric-blue/90'

  return (
    <div className="flex flex-col rounded-lab border border-blue-light bg-lab-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-light text-2xl">
        {typeIcon[type]}
      </span>
      <h3 className="mt-4 font-bold text-deep-blue">{title}</h3>
      {description && (
        <p className="mt-1 flex-1 text-sm text-gray-500">{description}</p>
      )}

      {type === 'text' ? (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className={actionClass}
          >
            {expanded ? 'Hide' : typeAction.text}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <p className="mt-4 whitespace-pre-line rounded-lab bg-blue-light/50 p-4 text-sm text-gray-600">
                  {content}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${actionClass} self-start`}
          >
            {typeAction[type]}
          </a>
        )
      )}
    </div>
  )
}
