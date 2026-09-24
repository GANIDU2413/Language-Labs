'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ListeningQuestion } from '@/types'
import {
  clearMediaCache,
  isMediaCached,
  preloadAudio,
  preloadImage,
} from '@/lib/mediaPreloader'

export interface PreloadItemState {
  id: string
  url: string
  type: 'audio' | 'image'
  label: string
  status: 'pending' | 'loading' | 'loaded' | 'error'
  error?: string
}

export interface UseMediaPreloaderReturn {
  status: 'idle' | 'loading' | 'success' | 'error'
  items: PreloadItemState[]
  totalCount: number
  loadedCount: number
  failedCount: number
  progress: number
  isReady: boolean
  error: string | null
  retry: () => void
}

/**
 * Hook to preload and cache all required media assets for listening questions.
 * Prevents test activation until 100% of audio and images are successfully cached.
 */
export function useMediaPreloader(
  questions: ListeningQuestion[] | undefined
): UseMediaPreloaderReturn {
  const [items, setItems] = useState<PreloadItemState[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  // Track active run to prevent race conditions
  const runIdRef = useRef(0)

  // Build target item list whenever questions change
  const buildItems = useCallback((): PreloadItemState[] => {
    if (!questions || questions.length === 0) return []

    const list: PreloadItemState[] = []
    const seenUrls = new Set<string>()

    questions.forEach((q, idx) => {
      const qNum = idx + 1
      if (q.imageUrl && !seenUrls.has(q.imageUrl)) {
        seenUrls.add(q.imageUrl)
        list.push({
          id: `img-${q.id || idx}`,
          url: q.imageUrl,
          type: 'image',
          label: `Question ${qNum} Image`,
          status: isMediaCached(q.imageUrl) ? 'loaded' : 'pending',
        })
      }
      if (q.audioUrl && !seenUrls.has(q.audioUrl)) {
        seenUrls.add(q.audioUrl)
        list.push({
          id: `audio-${q.id || idx}`,
          url: q.audioUrl,
          type: 'audio',
          label: `Question ${qNum} Audio`,
          status: isMediaCached(q.audioUrl) ? 'loaded' : 'pending',
        })
      }
    })

    return list
  }, [questions])

  // Load a batch of items
  const loadItems = useCallback(async (currentItems: PreloadItemState[]) => {
    if (currentItems.length === 0) {
      setStatus('success')
      setError(null)
      return
    }

    const currentRunId = ++runIdRef.current
    setStatus('loading')
    setError(null)

    // Mark pending items as loading
    setItems((prev) =>
      prev.map((item) =>
        item.status === 'loaded' ? item : { ...item, status: 'loading', error: undefined }
      )
    )

    const updatedItems = [...currentItems]
    let hasFailure = false

    // Process items with controlled concurrency (3 parallel workers)
    const queue = updatedItems.map((item, index) => ({ item, index }))
    const concurrency = Math.min(3, queue.length)

    async function worker() {
      while (queue.length > 0) {
        if (runIdRef.current !== currentRunId) return
        const work = queue.shift()
        if (!work) break
        const { item, index } = work

        if (item.status === 'loaded' || isMediaCached(item.url)) {
          updatedItems[index] = { ...item, status: 'loaded', error: undefined }
          setItems([...updatedItems])
          continue
        }

        try {
          if (item.type === 'audio') {
            await preloadAudio(item.url)
          } else {
            await preloadImage(item.url)
          }

          if (runIdRef.current !== currentRunId) return
          updatedItems[index] = { ...item, status: 'loaded', error: undefined }
          setItems([...updatedItems])
        } catch (err) {
          if (runIdRef.current !== currentRunId) return
          hasFailure = true
          const msg =
            err instanceof Error
              ? err.message
              : 'Network error occurred while downloading asset'
          updatedItems[index] = { ...item, status: 'error', error: msg }
          setItems([...updatedItems])
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))

    if (runIdRef.current !== currentRunId) return

    const failed = updatedItems.filter((i) => i.status === 'error')
    if (failed.length > 0 || hasFailure) {
      setStatus('error')
      setError(
        `Failed to preload ${failed.length} listening asset${failed.length === 1 ? '' : 's'}. Please check your connection and retry.`
      )
    } else {
      setStatus('success')
      setError(null)
    }
  }, [])

  // Initialize and start loading when questions arrive
  useEffect(() => {
    if (!questions) return
    let active = true

    const initialItems = buildItems()

    Promise.resolve().then(() => {
      if (!active) return

      setItems(initialItems)

      if (initialItems.length === 0) {
        setStatus('success')
        setError(null)
        return
      }

      // Check if everything is already cached
      const allCached = initialItems.every((item) => item.status === 'loaded')
      if (allCached) {
        setStatus('success')
        setError(null)
        return
      }

      loadItems(initialItems)
    })

    return () => {
      active = false
    }
  }, [questions, buildItems, loadItems])

  // Cleanup on unmount if needed
  useEffect(() => {
    const currentRunRef = runIdRef
    return () => {
      currentRunRef.current++
    }
  }, [])

  // Retry function: only re-fetch items that are not loaded yet
  const retry = useCallback(() => {
    setItems((prev) => {
      const resetItems = prev.map((item) =>
        item.status === 'error'
          ? ({ ...item, status: 'pending', error: undefined } as PreloadItemState)
          : item
      )
      loadItems(resetItems)
      return resetItems
    })
  }, [loadItems])

  const totalCount = items.length
  const loadedCount = items.filter((i) => i.status === 'loaded').length
  const failedCount = items.filter((i) => i.status === 'error').length
  const progress = totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 100
  const isReady = totalCount === 0 || loadedCount === totalCount

  return {
    status,
    items,
    totalCount,
    loadedCount,
    failedCount,
    progress,
    isReady,
    error,
    retry,
  }
}

export { clearMediaCache }
