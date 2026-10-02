'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { getCollection, getDocument } from '@/lib/firestore'
import { getYouTubeId } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import ErrorState from '@/components/ui/ErrorState'
import { CardGridSkeleton, Skeleton } from '@/components/ui/Skeleton'
import type { Lab, Resource, ResourceType } from '@/types'

type Filter = 'all' | 'pdf' | 'youtube' | 'text'

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pdf', label: 'PDFs' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'text', label: 'Reading & Study' },
]

const typeIcon: Record<ResourceType, string> = {
  pdf: '📄',
  youtube: '▶️',
  text: '📝',
}

/** Current week of the lab: days since start / 7, rounded up (0 before start) */
function currentWeekOf(lab: Lab): number {
  const days = Math.floor(
    (Date.now() - lab.startDate.toMillis()) / (1000 * 60 * 60 * 24)
  )
  if (days < 0) return 0
  return Math.min(Math.ceil((days + 1) / 7), 16)
}

function ResourceCard({ resource }: { resource: Resource }) {
  const [expanded, setExpanded] = useState(false)
  const videoId = resource.youtubeUrl ? getYouTubeId(resource.youtubeUrl) : null
  const thumbnail =
    resource.thumbnailUrl ??
    (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null)

  return (
    <Card className="flex flex-col p-4">
      {/* YouTube thumbnail */}
      {resource.type === 'youtube' && thumbnail && (
        <a
          href={resource.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative mb-3 block aspect-video overflow-hidden rounded-lab bg-deep-blue"
        >
          <Image
            src={thumbnail}
            alt={resource.title}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-deep-blue/70 pl-1 text-xl text-lab-white transition-colors group-hover:bg-electric-blue">
              ▶
            </span>
          </span>
        </a>
      )}

      <div className="flex items-start gap-3">
        {resource.type !== 'youtube' && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-light text-xl">
            {typeIcon[resource.type]}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-deep-blue">{resource.title}</h3>
          {resource.description && (
            <p className="mt-0.5 text-sm text-gray-500">{resource.description}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      {resource.type === 'pdf' && resource.fileUrl && (
        <a
          href={resource.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block self-start rounded-lab bg-electric-blue px-4 py-2 text-sm font-semibold text-lab-white transition-colors hover:bg-electric-blue/90"
        >
          ⬇️ Download
        </a>
      )}
      {resource.type === 'text' && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 self-start rounded-lab bg-electric-blue px-4 py-2 text-sm font-semibold text-lab-white transition-colors hover:bg-electric-blue/90"
          >
            {expanded ? 'Hide' : 'Read'}
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
                <p className="mt-3 whitespace-pre-line rounded-lab bg-blue-light/50 p-4 text-sm text-gray-600">
                  {resource.content}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </Card>
  )
}

function LockedCard({ resource }: { resource: Resource }) {
  return (
    <Card className="flex items-start gap-3 bg-gray-50 p-4 opacity-80">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xl">
        🔒
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-gray-500">{resource.title}</h3>
        {resource.description && (
          <p className="mt-0.5 text-sm text-gray-400">{resource.description}</p>
        )}
        <Badge variant="warning">Unlocks in Week {resource.unlockWeek}</Badge>
      </div>
    </Card>
  )
}

export default function StudentResourcesPage() {
  const { user } = useAuth()
  const [resources, setResources] = useState<Resource[] | null>(null)
  const [lab, setLab] = useState<Lab | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [fetchError, setFetchError] = useState(false)

  function loadData() {
    if (!user) return
    setFetchError(false)
    setResources(null)
    Promise.all([
      getCollection<Resource>('resources'),
      user.enrolledLabId
        ? getDocument<Lab>('labs', user.enrolledLabId)
        : Promise.resolve(null),
    ])
      .then(([all, labDoc]) => {
        setResources(
          all.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
        )
        setLab(labDoc)
      })
      .catch(() => setFetchError(true))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadData, [user])

  if (fetchError) {
    return (
      <div className="px-4 py-8 sm:px-8">
        <ErrorState onRetry={loadData} />
      </div>
    )
  }

  if (!resources || !user) {
    return (
      <div className="px-4 py-8 sm:px-8">
        <Skeleton className="h-8 w-48" />
        <div className="mt-8">
          <CardGridSkeleton
            count={6}
            cardClassName="h-40"
            gridClassName="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
          />
        </div>
      </div>
    )
  }

  const currentWeek = lab
    ? lab.status === 'completed'
      ? 16
      : Math.max(
          lab.currentWeek ?? 1,
          (lab.weekCompleted ?? 0) + 1,
          currentWeekOf(lab)
        )
    : 0

  const matchesFilter = (r: Resource) => filter === 'all' || r.type === filter

  const freeResources = resources
    .filter((r) => r.isFree && r.type !== 'youtube' && matchesFilter(r))
    .sort((a, b) => {
      if (a.type !== b.type) {
        if (a.type === 'pdf') return -1
        if (b.type === 'pdf') return 1
      }
      return (
        (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
      )
    })
  const labResources = resources
    .filter((r) => !r.isFree && matchesFilter(r))
    .sort((a, b) => (a.unlockWeek ?? 0) - (b.unlockWeek ?? 0))
  const unlocked = labResources.filter((r) => (r.unlockWeek ?? 1) <= currentWeek)
  const locked = labResources.filter((r) => (r.unlockWeek ?? 1) > currentWeek)

  return (
    <div className="px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-deep-blue">Resources 📚</h1>
          <p className="mt-1 text-sm text-gray-500">
            {lab
              ? `You're in Week ${Math.max(currentWeek, 1)} of ${lab.name}.`
              : 'Free materials for every lab scientist.'}
          </p>
        </div>
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lab px-3 py-1.5 text-sm font-semibold transition-colors ${
                filter === f.value
                  ? 'bg-electric-blue text-lab-white'
                  : 'bg-lab-white text-gray-600 hover:bg-blue-light'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lab materials */}
      <h2 className="mt-8 text-lg font-bold text-deep-blue">
        Your Lab Materials 🧪
      </h2>
      {unlocked.length === 0 && locked.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">
          No lab materials {filter !== 'all' && 'of this type '}yet — they
          appear here as your lab progresses.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {unlocked.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
          {locked.map((r) => (
            <LockedCard key={r.id} resource={r} />
          ))}
        </div>
      )}

      {/* Free resources */}
      <h2 className="mt-10 text-lg font-bold text-deep-blue">
        Free Resources 🌍
      </h2>
      {freeResources.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">
          No free resources {filter !== 'all' && 'of this type '}right now.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {freeResources.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}
    </div>
  )
}
