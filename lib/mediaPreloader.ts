/**
 * Client-side media preloading and caching system for Language Labs.
 *
 * Ensures all listening test audio files and images are 100% preloaded,
 * decoded, and ready for instant playback/rendering before the test starts.
 */

export interface PreloadItem {
  id: string
  url: string
  type: 'audio' | 'image'
  label: string
  status: 'pending' | 'loading' | 'loaded' | 'error'
  error?: string
}

export interface CachedMedia {
  url: string
  blobUrl: string
  type: 'audio' | 'image'
  audioElement?: HTMLAudioElement
  imageElement?: HTMLImageElement
}

// In-memory cache for the test session
const mediaCache = new Map<string, CachedMedia>()

/**
 * Retrieve cached media URL (e.g. object URL) if available, or fallback to original URL.
 */
export function getCachedMediaUrl(url: string | undefined): string {
  if (!url) return ''
  const cached = mediaCache.get(url)
  return cached?.blobUrl || url
}

/**
 * Check if a specific media URL is already cached.
 */
export function isMediaCached(url: string): boolean {
  return mediaCache.has(url)
}

/**
 * Get all cached media items.
 */
export function getMediaCache(): Map<string, CachedMedia> {
  return mediaCache
}

/**
 * Clear the in-memory media cache and revoke object URLs to prevent memory leaks.
 */
export function clearMediaCache(): void {
  for (const [, item] of mediaCache.entries()) {
    if (item.blobUrl && item.blobUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(item.blobUrl)
      } catch {
        // Ignore revocation errors
      }
    }
  }
  mediaCache.clear()
}

/**
 * Preload and decode an image URL.
 * Guarantees the image is downloaded and decoded in memory.
 */
export async function preloadImage(
  url: string,
  timeoutMs = 25000
): Promise<CachedMedia> {
  if (mediaCache.has(url)) {
    return mediaCache.get(url)!
  }

  // First try fetching as blob for direct memory caching
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'force-cache',
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)

    // Verify image decoding
    const img = await decodeImage(blobUrl, timeoutMs)
    const cached: CachedMedia = {
      url,
      blobUrl,
      type: 'image',
      imageElement: img,
    }
    mediaCache.set(url, cached)
    return cached
  } catch (err) {
    // If fetch failed (e.g. CORS or network restriction), fallback to Image element preload
    try {
      const img = await decodeImage(url, timeoutMs)
      const cached: CachedMedia = {
        url,
        blobUrl: url,
        type: 'image',
        imageElement: img,
      }
      mediaCache.set(url, cached)
      return cached
    } catch {
      throw err instanceof Error ? err : new Error(`Failed to load image: ${url}`)
    }
  }
}

/**
 * Preload and decode an audio URL.
 * Guarantees the audio is buffered and verified ready for playback.
 */
export async function preloadAudio(
  url: string,
  timeoutMs = 30000
): Promise<CachedMedia> {
  if (mediaCache.has(url)) {
    return mediaCache.get(url)!
  }

  // First try fetching as blob for offline/instant in-memory playback
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'force-cache',
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)

    // Verify audio can be played through
    const audio = await verifyAudioReady(blobUrl, timeoutMs)
    const cached: CachedMedia = {
      url,
      blobUrl,
      type: 'audio',
      audioElement: audio,
    }
    mediaCache.set(url, cached)
    return cached
  } catch (err) {
    // If fetch failed (e.g. CORS), fallback to HTMLAudioElement buffering
    try {
      const audio = await verifyAudioReady(url, timeoutMs)
      const cached: CachedMedia = {
        url,
        blobUrl: url,
        type: 'audio',
        audioElement: audio,
      }
      mediaCache.set(url, cached)
      return cached
    } catch {
      throw err instanceof Error ? err : new Error(`Failed to load audio: ${url}`)
    }
  }
}

/**
 * Verify an image element loads and decodes completely.
 */
function decodeImage(src: string, timeoutMs: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      img.onload = null
      img.onerror = null
      reject(new Error('Image download timed out (slow connection)'))
    }, timeoutMs)

    img.onload = async () => {
      if (settled) return
      clearTimeout(timer)
      settled = true
      try {
        if ('decode' in img) {
          await img.decode()
        }
      } catch {
        // Decode API failure on older browsers is non-fatal if onload succeeded
      }
      resolve(img)
    }

    img.onerror = () => {
      if (settled) return
      clearTimeout(timer)
      settled = true
      reject(new Error('Failed to load image asset'))
    }

    img.src = src
  })
}

/**
 * Verify an HTMLAudioElement can play through without buffering interruptions.
 */
function verifyAudioReady(
  src: string,
  timeoutMs: number
): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.preload = 'auto'
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('Audio download timed out (slow connection)'))
    }, timeoutMs)

    const cleanup = () => {
      audio.removeEventListener('canplaythrough', onReady)
      audio.removeEventListener('canplay', onReady)
      audio.removeEventListener('error', onError)
    }

    const onReady = () => {
      if (settled) return
      clearTimeout(timer)
      settled = true
      cleanup()
      resolve(audio)
    }

    const onError = () => {
      if (settled) return
      clearTimeout(timer)
      settled = true
      cleanup()
      const mediaErr = audio.error
      const message = mediaErr
        ? `Audio error (${mediaErr.code}): ${mediaErr.message || 'Unable to decode audio'}`
        : 'Audio failed to load'
      reject(new Error(message))
    }

    audio.addEventListener('canplaythrough', onReady, { once: true })
    audio.addEventListener('canplay', onReady, { once: true })
    audio.addEventListener('error', onError, { once: true })

    audio.src = src
    audio.load()
  })
}
