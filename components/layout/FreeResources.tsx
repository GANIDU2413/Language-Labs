import { Suspense } from 'react'
import { queryCollection } from '@/lib/firestore'
import ResourceCard from '@/components/layout/ResourceCard'
import type { Resource } from '@/types'

async function getFreeResources(): Promise<Resource[]> {
  try {
    return await queryCollection<Resource>('resources', 'isFree', '==', true)
  } catch {
    return []
  }
}

async function ResourceGrid() {
  const resources = await getFreeResources()

  if (resources.length === 0) {
    return (
      <p className="mt-12 text-center text-gray-500">
        Free experiments are being prepared — check back soon! 🧪
      </p>
    )
  }

  return (
    <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          title={resource.title}
          description={resource.description}
          type={resource.type}
          url={resource.type === 'youtube' ? resource.youtubeUrl : resource.fileUrl}
          content={resource.content}
        />
      ))}
    </div>
  )
}

function ResourcesSkeleton() {
  return (
    <div className="mt-12 grid animate-pulse grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-52 rounded-lab bg-blue-light" />
      ))}
    </div>
  )
}

export default function FreeResources() {
  return (
    <section className="bg-blue-light/40">
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
