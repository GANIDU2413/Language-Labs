'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { getCollection, getDocument } from '@/lib/firestore'
import { getYouTubeId } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import ErrorState from '@/components/ui/ErrorState'
import ResourceCard from '@/components/layout/ResourceCard'
import { assignCardStyles } from '@/lib/resourceStyles'
import type { Lab, Resource } from '@/types'

type CategoryTab = 'all' | 'youtube' | 'pdf' | 'text'

const categoryTabs: { id: CategoryTab; label: string; icon: string }[] = [
  { id: 'all', label: 'All Resources', icon: '📚' },
  { id: 'youtube', label: 'YouTube Videos', icon: '🎬' },
  { id: 'pdf', label: 'PDF Uploads', icon: '📄' },
  { id: 'text', label: 'Text Posts', icon: '📝' },
]

/** Current week of the lab: days since start / 7, rounded up (0 before start) */
function currentWeekOf(lab: Lab): number {
  const days = Math.floor(
    (Date.now() - lab.startDate.toMillis()) / (1000 * 60 * 60 * 24)
  )
  if (days < 0) return 0
  return Math.min(Math.ceil((days + 1) / 7), 16)
}

function getTimestampMillis(r: Resource): number {
  if (!r.createdAt) return 0
  if (typeof r.createdAt.toMillis === 'function') return r.createdAt.toMillis()
  if (r.createdAt instanceof Date) return r.createdAt.getTime()
  return 0
}

/**
 * YouTube Video card styled exactly like the "Inside the Lab" section on the homepage
 */
function VideoResourceCard({
  video,
  isLocked = false,
  unlockWeek,
}: {
  video: Resource
  isLocked?: boolean
  unlockWeek?: number
}) {
  const videoId = video.youtubeUrl ? getYouTubeId(video.youtubeUrl) : null
  const thumbnail =
    video.thumbnailUrl ||
    (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null)

  if (isLocked) {
    return (
      <div className="group relative flex flex-col overflow-hidden rounded-lab border border-gray-200 bg-lab-white opacity-80 shadow-sm cursor-not-allowed">
        <div className="relative aspect-video bg-deep-blue">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={video.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover opacity-60 grayscale-[30%]"
            />
          ) : null}
          {/* Lock icon overlay */}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-deep-blue/80 text-2xl text-lab-white shadow-md">
              🔒
            </span>
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            <h4 className="font-semibold text-gray-700">{video.title}</h4>
            {video.description && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-400">
                {video.description}
              </p>
            )}
          </div>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              🔒 Unlocks in Week {unlockWeek ?? 1}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <a
      href={video.youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col overflow-hidden rounded-lab border border-blue-light/60 bg-lab-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative aspect-video bg-deep-blue">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={video.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        {/* Play icon overlay */}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-deep-blue/70 pl-1 text-2xl text-lab-white transition-colors group-hover:bg-electric-blue shadow-md">
            ▶
          </span>
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <h4 className="font-semibold text-deep-blue">{video.title}</h4>
          {video.description && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-500">
              {video.description}
            </p>
          )}
        </div>
        {unlockWeek && (
          <div className="mt-3">
            <span className="inline-flex items-center rounded-full bg-blue-light px-2.5 py-0.5 text-xs font-medium text-electric-blue">
              Week {unlockWeek} Material
            </span>
          </div>
        )}
      </div>
    </a>
  )
}

function SectionLoadingSkeleton() {
  return (
    <div className="mx-auto mt-6 max-w-5xl space-y-8 animate-pulse">
      <div>
        <div className="mb-4 h-6 w-36 rounded bg-blue-light/80" />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 lg:gap-5 justify-items-center">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[170px] sm:h-[220px] md:h-[255px] w-[85%] mx-auto rounded-[14px] sm:rounded-[16px] bg-blue-light/60"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function StudentResourcesPage() {
  const { user } = useAuth()
  const [resources, setResources] = useState<Resource[] | null>(null)
  const [lab, setLab] = useState<Lab | null>(null)
  const [activeTab, setActiveTab] = useState<CategoryTab>('all')
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
          all.sort((a, b) => getTimestampMillis(b) - getTimestampMillis(a))
        )
        setLab(labDoc)
      })
      .catch(() => setFetchError(true))
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.enrolledLabId])

  const currentWeek = useMemo(() => {
    if (!lab) return 0
    if (lab.status === 'completed') return 16
    return Math.max(
      lab.currentWeek ?? 1,
      (lab.weekCompleted ?? 0) + 1,
      currentWeekOf(lab)
    )
  }, [lab])

  // Partition resources into Lab Materials vs Free Resources
  const { labVideos, labPdfs, labTexts, freeVideos, freePdfs, freeTexts } =
    useMemo(() => {
      if (!resources) {
        return {
          labVideos: [],
          labPdfs: [],
          labTexts: [],
          freeVideos: [],
          freePdfs: [],
          freeTexts: [],
        }
      }

      // Lab materials: !r.isFree and belongs to student's lab
      const labItems = resources.filter(
        (r) =>
          !r.isFree &&
          (!user?.enrolledLabId || !r.labId || r.labId === user.enrolledLabId)
      )

      // Sort lab items by unlockWeek
      labItems.sort((a, b) => (a.unlockWeek ?? 1) - (b.unlockWeek ?? 1))

      const lVideos = labItems.filter(
        (r) => r.type === 'youtube' && Boolean(r.youtubeUrl)
      )
      const lPdfs = labItems.filter((r) => r.type === 'pdf')
      const lTexts = labItems.filter((r) => r.type === 'text')

      // Free resources: isFree === true
      const freeItems = resources.filter((r) => r.isFree)
      freeItems.sort(
        (a, b) => getTimestampMillis(b) - getTimestampMillis(a)
      )

      const fVideos = freeItems.filter(
        (r) => r.type === 'youtube' && Boolean(r.youtubeUrl)
      )
      const fPdfs = freeItems.filter((r) => r.type === 'pdf')
      const fTexts = freeItems.filter((r) => r.type === 'text')

      return {
        labVideos: lVideos,
        labPdfs: lPdfs,
        labTexts: lTexts,
        freeVideos: fVideos,
        freePdfs: fPdfs,
        freeTexts: fTexts,
      }
    }, [resources, user?.enrolledLabId])

  // Style cards dynamically with random colors and character images
  const styledLabPdfs = useMemo(() => assignCardStyles(labPdfs), [labPdfs])
  const styledLabTexts = useMemo(
    () =>
      assignCardStyles(
        labTexts,
        styledLabPdfs[styledLabPdfs.length - 1]?.cardColor.rgb,
        styledLabPdfs[styledLabPdfs.length - 1]?.assignedImage
      ),
    [labTexts, styledLabPdfs]
  )

  const styledFreePdfs = useMemo(() => assignCardStyles(freePdfs), [freePdfs])
  const styledFreeTexts = useMemo(
    () =>
      assignCardStyles(
        freeTexts,
        styledFreePdfs[styledFreePdfs.length - 1]?.cardColor.rgb,
        styledFreePdfs[styledFreePdfs.length - 1]?.assignedImage
      ),
    [freeTexts, styledFreePdfs]
  )

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
        <div className="h-8 w-48 rounded bg-blue-light/80 animate-pulse" />
        <SectionLoadingSkeleton />
      </div>
    )
  }

  const showYoutube = activeTab === 'all' || activeTab === 'youtube'
  const showPdf = activeTab === 'all' || activeTab === 'pdf'
  const showText = activeTab === 'all' || activeTab === 'text'

  const hasLabItems =
    (showYoutube && labVideos.length > 0) ||
    (showPdf && labPdfs.length > 0) ||
    (showText && labTexts.length > 0)

  const hasFreeItems =
    (showYoutube && freeVideos.length > 0) ||
    (showPdf && freePdfs.length > 0) ||
    (showText && freeTexts.length > 0)

  return (
    <div className="px-4 py-8 sm:px-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-blue-light pb-6">
        <div>
          <h1 className="text-2xl font-bold text-deep-blue sm:text-3xl">
            Resources 📚
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {lab
              ? `You are currently in Week ${Math.max(currentWeek, 1)} of ${lab.name}.`
              : 'Lab and free learning materials for your English fluency journey.'}
          </p>
        </div>

        {/* Category Tabs: YouTube Videos, PDF Uploads, Text Posts */}
        <div className="flex flex-wrap gap-2">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-electric-blue text-lab-white shadow-sm scale-105'
                  : 'bg-lab-white text-gray-600 hover:bg-blue-light hover:text-deep-blue border border-blue-light/80'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. HEADING: YOUR LAB MATERIALS 🧪                                         */}
      {/* ========================================================================= */}
      <section className="mt-10">
        <div className="flex items-center justify-between border-b border-blue-light/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-electric-blue text-lg text-lab-white shadow-sm">
              🧪
            </span>
            <div>
              <h2 className="text-xl font-bold text-deep-blue">
                Your Lab Materials
              </h2>
              <p className="text-xs text-gray-500">
                Exclusive course materials that unlock with your weekly lab sessions.
              </p>
            </div>
          </div>
        </div>

        {!hasLabItems ? (
          <p className="mt-6 rounded-lab border border-dashed border-blue-light/80 bg-lab-white/40 p-6 text-center text-sm text-gray-400">
            No lab materials available in this category yet. New materials appear here as your lab progresses!
          </p>
        ) : (
          <div className="mt-6 space-y-10">
            {/* Part 1: YouTube Videos */}
            {showYoutube && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-light text-sm">
                      🎬
                    </span>
                    <h3 className="text-base font-bold text-deep-blue">
                      YouTube Videos
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-gray-400">
                    {labVideos.length} {labVideos.length === 1 ? 'video' : 'videos'}
                  </span>
                </div>

                {labVideos.length === 0 ? (
                  <p className="rounded-lab border border-dashed border-blue-light/80 bg-lab-white/40 p-5 text-center text-xs text-gray-400">
                    No lab video lectures uploaded yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {labVideos.map((video) => {
                      const isLocked = (video.unlockWeek ?? 1) > currentWeek
                      return (
                        <VideoResourceCard
                          key={video.id}
                          video={video}
                          isLocked={isLocked}
                          unlockWeek={video.unlockWeek}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Part 2: PDF Uploads */}
            {showPdf && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-light text-sm">
                      📄
                    </span>
                    <h3 className="text-base font-bold text-deep-blue">
                      PDF Uploads
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-gray-400">
                    {labPdfs.length} {labPdfs.length === 1 ? 'file' : 'files'}
                  </span>
                </div>

                {labPdfs.length === 0 ? (
                  <p className="rounded-lab border border-dashed border-blue-light/80 bg-lab-white/40 p-5 text-center text-xs text-gray-400">
                    No lab PDF documents uploaded yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 lg:gap-5 justify-items-center">
                    {styledLabPdfs.map((resource) => {
                      const isLocked = (resource.unlockWeek ?? 1) > currentWeek
                      return (
                        <ResourceCard
                          key={resource.id}
                          title={resource.title}
                          description={resource.description}
                          type={resource.type}
                          url={resource.fileUrl}
                          content={resource.content}
                          thumbnailImage={resource.assignedImage}
                          cardColor={resource.cardColor}
                          isLocked={isLocked}
                          unlockWeek={resource.unlockWeek}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Part 3: Text Posts */}
            {showText && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-light text-sm">
                      📝
                    </span>
                    <h3 className="text-base font-bold text-deep-blue">
                      Text Posts
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-gray-400">
                    {labTexts.length} {labTexts.length === 1 ? 'post' : 'posts'}
                  </span>
                </div>

                {labTexts.length === 0 ? (
                  <p className="rounded-lab border border-dashed border-blue-light/80 bg-lab-white/40 p-5 text-center text-xs text-gray-400">
                    No lab reading exercises or notes uploaded yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 lg:gap-5 justify-items-center">
                    {styledLabTexts.map((resource) => {
                      const isLocked = (resource.unlockWeek ?? 1) > currentWeek
                      return (
                        <ResourceCard
                          key={resource.id}
                          title={resource.title}
                          description={resource.description}
                          type={resource.type}
                          url={resource.fileUrl}
                          content={resource.content}
                          thumbnailImage={resource.assignedImage}
                          cardColor={resource.cardColor}
                          isLocked={isLocked}
                          unlockWeek={resource.unlockWeek}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 2. HEADING: FREE RESOURCES 🌍                                             */}
      {/* ========================================================================= */}
      <section className="mt-14 pt-8 border-t border-blue-light">
        <div className="flex items-center justify-between border-b border-blue-light/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-lg text-lab-white shadow-sm">
              🌍
            </span>
            <div>
              <h2 className="text-xl font-bold text-deep-blue">
                Free Resources
              </h2>
              <p className="text-xs text-gray-500">
                Self-paced learning materials available to all Language Labs members.
              </p>
            </div>
          </div>
        </div>

        {!hasFreeItems ? (
          <p className="mt-6 rounded-lab border border-dashed border-blue-light/80 bg-lab-white/40 p-6 text-center text-sm text-gray-400">
            No free resources available in this category right now.
          </p>
        ) : (
          <div className="mt-6 space-y-10">
            {/* Part 1: YouTube Videos */}
            {showYoutube && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-light text-sm">
                      🎬
                    </span>
                    <h3 className="text-base font-bold text-deep-blue">
                      YouTube Videos
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-gray-400">
                    {freeVideos.length} {freeVideos.length === 1 ? 'video' : 'videos'}
                  </span>
                </div>

                {freeVideos.length === 0 ? (
                  <p className="rounded-lab border border-dashed border-blue-light/80 bg-lab-white/40 p-5 text-center text-xs text-gray-400">
                    No free video lessons available right now.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {freeVideos.map((video) => (
                      <VideoResourceCard key={video.id} video={video} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Part 2: PDF Uploads */}
            {showPdf && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-light text-sm">
                      📄
                    </span>
                    <h3 className="text-base font-bold text-deep-blue">
                      PDF Uploads
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-gray-400">
                    {freePdfs.length} {freePdfs.length === 1 ? 'file' : 'files'}
                  </span>
                </div>

                {freePdfs.length === 0 ? (
                  <p className="rounded-lab border border-dashed border-blue-light/80 bg-lab-white/40 p-5 text-center text-xs text-gray-400">
                    No free PDF resources uploaded yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 lg:gap-5 justify-items-center">
                    {styledFreePdfs.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        title={resource.title}
                        description={resource.description}
                        type={resource.type}
                        url={resource.fileUrl}
                        content={resource.content}
                        thumbnailImage={resource.assignedImage}
                        cardColor={resource.cardColor}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Part 3: Text Posts */}
            {showText && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-light text-sm">
                      📝
                    </span>
                    <h3 className="text-base font-bold text-deep-blue">
                      Text Posts
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-gray-400">
                    {freeTexts.length} {freeTexts.length === 1 ? 'post' : 'posts'}
                  </span>
                </div>

                {freeTexts.length === 0 ? (
                  <p className="rounded-lab border border-dashed border-blue-light/80 bg-lab-white/40 p-5 text-center text-xs text-gray-400">
                    No free text posts uploaded yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 lg:gap-5 justify-items-center">
                    {styledFreeTexts.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        title={resource.title}
                        description={resource.description}
                        type={resource.type}
                        url={resource.fileUrl}
                        content={resource.content}
                        thumbnailImage={resource.assignedImage}
                        cardColor={resource.cardColor}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
