import { Suspense } from 'react'
import { queryCollection } from '@/lib/firestore'
import ResourceCard from '@/components/layout/ResourceCard'
import { assignCardStyles } from '@/lib/resourceStyles'
import type { Resource } from '@/types'

function getTimestampMillis(r: Resource): number {
  if (!r.createdAt) return 0
  if (typeof r.createdAt.toMillis === 'function') return r.createdAt.toMillis()
  if (r.createdAt instanceof Date) return r.createdAt.getTime()
  return 0
}

interface CategorizedFreeResources {
  pdfs: Resource[]
  texts: Resource[]
}

async function getFreeResources(): Promise<CategorizedFreeResources> {
  try {
    const free = await queryCollection<Resource>('resources', 'isFree', '==', true)

    // YouTube links added as free resources are displayed exclusively under "Inside the Lab"
    // and must not appear under the "Free Resources" section.
    const pdfs = free
      .filter((r) => r.type === 'pdf')
      .sort((a, b) => getTimestampMillis(b) - getTimestampMillis(a))

    const texts = free
      .filter((r) => r.type === 'text')
      .sort((a, b) => getTimestampMillis(b) - getTimestampMillis(a))

    return { pdfs, texts }
  } catch {
    return { pdfs: [], texts: [] }
  }
}

async function ResourceGrid() {
  const { pdfs, texts } = await getFreeResources()

  const hasPdfs = pdfs.length > 0
  const hasTexts = texts.length > 0

  if (!hasPdfs && !hasTexts) {
    return (
      <p className="mt-12 text-center text-gray-500">
        Free experiments are being prepared — check back soon! 🧪
      </p>
    )
  }

  // Dynamically assign CourseOverview colors & mini-images ensuring no neighboring collisions
  const styledPdfs = assignCardStyles(pdfs)
  const lastPdf = styledPdfs[styledPdfs.length - 1]
  const styledTexts = assignCardStyles(
    texts,
    lastPdf?.cardColor.rgb,
    lastPdf?.assignedImage
  )

  return (
    <div className="mx-auto mt-10 max-w-5xl space-y-10">
      {/* 1st Row: PDF Uploads */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-light text-base">
              📄
            </span>
            <h3 className="text-lg font-bold text-deep-blue">PDF Uploads</h3>
          </div>
          <span className="text-xs font-semibold text-gray-400">
            {hasPdfs ? `${pdfs.length} ${pdfs.length === 1 ? 'file' : 'files'}` : 'None yet'}
          </span>
        </div>

        {hasPdfs ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 lg:gap-5 justify-items-center">
            {styledPdfs.map((resource) => (
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
        ) : (
          <p className="rounded-lab border border-dashed border-blue-light/80 bg-lab-white/40 p-6 text-center text-sm text-gray-400">
            No PDF resources uploaded yet. Check back soon!
          </p>
        )}
      </div>

      {/* 2nd Row: Text Posts */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-light text-sm">
              📝
            </span>
            <h3 className="text-lg font-bold text-deep-blue">Text Posts</h3>
          </div>
          <span className="text-xs font-semibold text-gray-400">
            {hasTexts ? `${texts.length} ${texts.length === 1 ? 'post' : 'posts'}` : 'None yet'}
          </span>
        </div>

        {hasTexts ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 lg:gap-5 justify-items-center">
            {styledTexts.map((resource) => (
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
        ) : (
          <p className="rounded-lab border border-dashed border-blue-light/80 bg-lab-white/40 p-6 text-center text-sm text-gray-400">
            No text posts uploaded yet. Check back soon!
          </p>
        )}
      </div>
    </div>
  )
}

function ResourcesSkeleton() {
  return (
    <div className="mx-auto mt-10 max-w-5xl space-y-10">
      {/* 1st Row Skeleton */}
      <div>
        <div className="mb-4 h-6 w-36 animate-pulse rounded bg-blue-light/80" />
        <div className="grid animate-pulse grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 lg:gap-5 justify-items-center">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[170px] sm:h-[220px] md:h-[255px] w-[85%] mx-auto rounded-[14px] sm:rounded-[16px] bg-blue-light/60"
            />
          ))}
        </div>
      </div>
      {/* 2nd Row Skeleton */}
      <div>
        <div className="mb-4 h-6 w-36 animate-pulse rounded bg-blue-light/80" />
        <div className="grid animate-pulse grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 lg:gap-5 justify-items-center">
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

export default function FreeResources() {
  return (
    <section id="free-resources" className="bg-blue-light/40 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-deep-blue sm:text-4xl">
          Free Resources
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-gray-500">
          Start experimenting right away — no lab coat required.
        </p>
        <Suspense fallback={<ResourcesSkeleton />}>
          <ResourceGrid />
        </Suspense>
      </div>
    </section>
  )
}
