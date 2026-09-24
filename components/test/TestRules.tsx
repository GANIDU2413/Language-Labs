'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface TestRulesProps {
  /** Called when the student clicks "Start My Test" */
  onStart: () => void
  /** Called once microphone permission resolves (true = granted) */
  onMicGranted: (granted: boolean) => void
  /** Media preloading status */
  mediaStatus?: 'idle' | 'loading' | 'success' | 'error'
  /** Percentage (0-100) of media loaded */
  mediaProgress?: number
  /** Total number of media assets to preload */
  mediaTotalCount?: number
  /** Number of media assets successfully loaded */
  mediaLoadedCount?: number
  /** Whether 100% of media assets are loaded and ready */
  mediaReady?: boolean
  /** Error message if media preloading failed */
  mediaError?: string | null
  /** Function to retry loading failed media assets */
  onRetryMedia?: () => void
  /** Whether question bank is currently being fetched */
  questionsLoading?: boolean
}

type MicStatus = 'pending' | 'granted' | 'denied'

const rules = [
  {
    icon: '🧪',
    text: 'This is your safe space — there are no wrong answers, only chances to discover your level!',
  },
  {
    icon: '⏭️',
    text: 'Once you move to the next question, you cannot go back — so take your time with each one.',
  },
  {
    icon: '📋',
    text: 'The test has 4 sections: Reading, Vocabulary, Listening and Speaking.',
  },
  {
    icon: '🌱',
    text: "Don't worry about getting everything right — this helps us find the best starting point for you.",
  },
  {
    icon: '🤫',
    text: "Make sure you're in a quiet place for the speaking section.",
  },
]

// Deterministic bubble configs (no Math.random — keeps SSR and client HTML identical)
const bubbles = Array.from({ length: 10 }, (_, i) => ({
  left: `${(i * 10.7 + 3) % 95}%`,
  size: 10 + ((i * 11) % 30),
  opacity: 0.08 + ((i * 7) % 20) / 100,
  duration: 10 + ((i * 3) % 9),
  delay: (i * 1.9) % 7,
}))

export default function TestRules({
  onStart,
  onMicGranted,
  mediaStatus = 'idle',
  mediaProgress = 0,
  mediaTotalCount = 0,
  mediaLoadedCount = 0,
  mediaReady = true,
  mediaError = null,
  onRetryMedia,
  questionsLoading = false,
}: TestRulesProps) {
  const [micStatus, setMicStatus] = useState<MicStatus>('pending')
  const onMicGrantedRef = useRef(onMicGranted)

  useEffect(() => {
    onMicGrantedRef.current = onMicGranted
  }, [onMicGranted])

  const requestMic = useCallback(() => {
    setMicStatus('pending')
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop())
        setMicStatus('granted')
        onMicGrantedRef.current(true)
      })
      .catch(() => {
        setMicStatus('denied')
        onMicGrantedRef.current(false)
      })
  }, [])

  useEffect(() => {
    let active = true
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop())
        if (active) {
          setMicStatus('granted')
          onMicGrantedRef.current(true)
        }
      })
      .catch(() => {
        if (active) {
          setMicStatus('denied')
          onMicGrantedRef.current(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  // Strictly prevent starting the test until:
  // 1. Microphone check is resolved (granted or denied)
  // 2. Questions are loaded
  // 3. 100% of media assets are preloaded and ready for playback
  const canStart =
    micStatus !== 'pending' &&
    !questionsLoading &&
    mediaReady &&
    mediaStatus !== 'loading' &&
    mediaStatus !== 'error'

  function handleStart() {
    if (!canStart) return
    onStart()
  }

  function getButtonLabel() {
    if (questionsLoading) return 'Preparing Test Materials…'
    if (mediaStatus === 'loading') {
      return `Preloading Media (${mediaProgress}%)…`
    }
    if (mediaStatus === 'error') {
      return 'Media Preload Incomplete — Retry Above'
    }
    if (micStatus === 'pending') {
      return 'Checking Microphone…'
    }
    return 'Start My Test 🚀'
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-deep-blue px-4 py-10">
      {/* Floating lab bubbles */}
      {bubbles.map((bubble, i) => (
        <motion.span
          key={i}
          aria-hidden
          initial={{ y: 0 }}
          animate={{ y: '-110vh' }}
          transition={{
            duration: bubble.duration,
            delay: bubble.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -bottom-10 rounded-full bg-electric-blue"
          style={{
            left: bubble.left,
            width: bubble.size,
            height: bubble.size,
            opacity: bubble.opacity,
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-xl"
      >
        <Card>
          <h1 className="text-center text-2xl font-bold text-deep-blue sm:text-3xl">
            Welcome to Your English Experiment! 🔬
          </h1>
          <p className="mt-2 text-center text-sm font-medium text-electric-blue">
            ⏱️ Takes about 15–20 minutes
          </p>

          {/* Mic permission status */}
          {micStatus === 'pending' && (
            <p className="mt-5 rounded-lab bg-blue-light px-4 py-3 text-sm text-deep-blue">
              🎙️ Requesting microphone access for the speaking section…
            </p>
          )}
          {micStatus === 'granted' && (
            <p className="mt-5 rounded-lab bg-green-50 px-4 py-3 text-sm text-green-700">
              🎙️ Microphone ready! The speaking section is good to go.
            </p>
          )}
          {micStatus === 'denied' && (
            <div className="mt-5 rounded-lab bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p>
                🎙️ We couldn&apos;t access your microphone, so the speaking
                section will be skipped. No stress — you can still complete the
                rest of the test!
              </p>
              <button
                type="button"
                onClick={() => {
                  setMicStatus('pending')
                  requestMic()
                }}
                className="mt-2 font-semibold text-electric-blue hover:underline"
              >
                Try allowing the mic again
              </button>
            </div>
          )}

          {/* Media preloading state */}
          {questionsLoading && (
            <div className="mt-4 rounded-lab border border-blue-200 bg-blue-50/80 p-4">
              <div className="flex items-center gap-3">
                <LoadingSpinner size="sm" />
                <p className="text-sm font-medium text-deep-blue">
                  🧪 Initializing test lab and fetching question bank…
                </p>
              </div>
            </div>
          )}

          {!questionsLoading && mediaStatus === 'loading' && mediaTotalCount > 0 && (
            <div className="mt-4 rounded-lab border border-electric-blue/30 bg-blue-light/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold text-deep-blue">
                  <LoadingSpinner size="sm" /> Preloading Listening Media…
                </span>
                <span className="font-bold text-electric-blue">
                  {mediaLoadedCount} / {mediaTotalCount} ({mediaProgress}%)
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Caching audio clips and question images in memory to prevent missing audio and loading delays during your test.
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-blue-200/50">
                <motion.div
                  className="h-full rounded-full bg-electric-blue"
                  initial={{ width: 0 }}
                  animate={{ width: `${mediaProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {!questionsLoading && mediaStatus === 'error' && (
            <div className="mt-4 rounded-lab border border-red-200 bg-red-50 p-4 text-sm">
              <div className="flex items-start gap-2.5">
                <span className="text-lg">⚠️</span>
                <div className="flex-1">
                  <p className="font-semibold text-red-900">
                    Listening Media Preload Incomplete
                  </p>
                  <p className="mt-1 text-xs text-red-700">
                    {mediaError ||
                      'Some listening audio files or images could not be loaded due to a slow or unstable connection.'}
                  </p>
                  {onRetryMedia && (
                    <button
                      type="button"
                      onClick={onRetryMedia}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lab bg-seat-reserved px-3 py-1.5 text-xs font-semibold text-lab-white transition-colors hover:bg-seat-reserved/90"
                    >
                      🔄 Retry Preloading Media
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {!questionsLoading && mediaReady && mediaTotalCount > 0 && (
            <div className="mt-4 rounded-lab border border-green-200 bg-green-50 p-3.5 text-sm text-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎧</span>
                  <span className="font-semibold">
                    All listening audio & images preloaded and ready for playback!
                  </span>
                </div>
                <span className="rounded-full bg-green-200 px-2.5 py-0.5 text-xs font-bold text-green-900">
                  {mediaTotalCount}/{mediaTotalCount} Ready
                </span>
              </div>
            </div>
          )}

          {/* Rules */}
          <motion.ul
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.1, delayChildren: 0.3 }}
            className="mt-6 flex flex-col gap-4"
          >
            {rules.map((rule) => (
              <motion.li
                key={rule.icon}
                variants={{
                  hidden: { opacity: 0, x: -16 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
                }}
                className="flex items-start gap-3"
              >
                <span className="mt-0.5 text-xl">{rule.icon}</span>
                <p className="text-sm text-gray-600">{rule.text}</p>
              </motion.li>
            ))}
          </motion.ul>

          <Button
            size="lg"
            onClick={handleStart}
            disabled={!canStart}
            loading={mediaStatus === 'loading' || questionsLoading}
            className="mt-8 w-full"
          >
            {getButtonLabel()}
          </Button>
        </Card>
      </motion.div>
    </div>
  )
}
