import { Suspense } from 'react'
import Image from 'next/image'
import { queryCollection } from '@/lib/firestore'
import { getYouTubeId } from '@/lib/utils'
import type { Resource } from '@/types'

async function getLabVideos(): Promise<Resource[]> {
  try {
    const free = await queryCollection<Resource>(
      'resources',
      'isFree',
      '==',
      true
    )
    return free.filter((r) => r.type === 'youtube' && r.youtubeUrl)
  } catch {
    return []
  }
}

async function VideoGrid() {
  const videos = await getLabVideos()

  if (videos.length === 0) {
    return (
      <p className="mt-12 text-center text-gray-500">
        Lab footage is coming soon — subscribe to stay tuned! 🎬
      </p>
    )
  }

  return (
    <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
      {videos.map((video) => {
        const videoId = getYouTubeId(video.youtubeUrl!)
        return (
          <a
            key={video.id}
            href={video.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group overflow-hidden rounded-lab bg-lab-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-video bg-deep-blue">
              {videoId && (
                <Image
                  src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                  alt={video.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              {/* Play icon overlay */}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-deep-blue/70 pl-1 text-2xl text-lab-white transition-colors group-hover:bg-electric-blue">
                  ▶
                </span>
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-deep-blue">{video.title}</h3>
              {video.description && (
                <p className="mt-1 text-sm text-gray-500">{video.description}</p>
              )}
            </div>
          </a>
        )
      })}
    </div>
  )
}

function VideosSkeleton() {
  return (
    <div className="mt-12 grid animate-pulse grid-cols-1 gap-6 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="aspect-video rounded-lab bg-blue-light" />
      ))}
    </div>
  )
}

export default function InsideLab() {
  return (
    <section className="bg-lab-white">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-deep-blue sm:text-4xl">
          Inside the Lab
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-gray-500">
          Peek into real sessions and see the experiments in action.
        </p>
        <Suspense fallback={<VideosSkeleton />}>
          <VideoGrid />
        </Suspense>
      </div>
    </section>
  )
}
