'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { getCachedMediaUrl } from '@/lib/mediaPreloader'
import type { ListeningQuestion, TestAnswer } from '@/types'

interface ListeningSectionProps {
  questions: ListeningQuestion[]
  /** Called with all collected answers when the section is finished */
  onComplete: (answers: TestAnswer[]) => void
}

interface QuestionCardProps {
  question: ListeningQuestion
  selected: number | null
  onSelect: (index: number) => void
}

function QuestionCard({ question, selected, onSelect }: QuestionCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressTrackRef = useRef<HTMLDivElement | null>(null)

  const [playing, setPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioError, setAudioError] = useState(false)
  const [audioAttempt, setAudioAttempt] = useState(0)
  const [useNativeControls, setUseNativeControls] = useState(false)

  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageAttempt, setImageAttempt] = useState(0)

  const audioSrc = getCachedMediaUrl(question.audioUrl)
  const imageSrc = getCachedMediaUrl(question.imageUrl)


  async function togglePlay() {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      try {
        setIsBuffering(true)
        setAudioError(false)
        await audio.play()
        setPlaying(true)
        setIsBuffering(false)
      } catch (err: unknown) {
        setIsBuffering(false)
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        setPlaying(false)
        setAudioError(true)
      }
    }
  }

  function handleReplay() {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    setCurrentTime(0)
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => {})
  }

  function handleSeek(
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) {
    const progressBar = progressTrackRef.current
    const audio = audioRef.current
    if (!progressBar || !audio || !duration) return

    const rect = progressBar.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const newProgress = rect.width > 0 ? clickX / rect.width : 0
    const newTime = newProgress * duration

    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  function retryAudio() {
    setAudioError(false)
    setIsBuffering(false)
    setPlaying(false)
    setCurrentTime(0)
    setAudioAttempt((prev) => prev + 1)
  }

  function retryImage() {
    setImageError(false)
    setImageLoaded(false)
    setImageAttempt((prev) => prev + 1)
  }

  function formatTime(seconds: number): string {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const progress =
    duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0

  return (
    <Card className="mt-6 p-4 sm:p-6">
      {/* Image display */}
      <div className="relative flex w-full items-center justify-center overflow-hidden rounded-lab border border-blue-light/60 bg-blue-light/30 p-2 sm:p-3">
        {!imageLoaded && !imageError && (
          <div className="flex h-56 w-full items-center justify-center gap-2">
            <LoadingSpinner size="md" />
            <span className="text-xs text-gray-500">Loading picture…</span>
          </div>
        )}

        {imageError ? (
          <div className="flex h-56 w-full flex-col items-center justify-center p-4 text-center">
            <span className="text-2xl">🖼️</span>
            <p className="mt-1 text-sm font-medium text-seat-reserved">
              Image failed to load
            </p>
            <button
              type="button"
              onClick={retryImage}
              className="mt-2 text-xs font-semibold text-electric-blue hover:underline"
            >
              🔄 Retry loading image
            </button>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={`${imageSrc}-${imageAttempt}`}
            src={imageSrc}
            alt={question.question}
            className={`h-auto max-h-[500px] w-auto max-w-full rounded-lab object-contain shadow-xs transition-opacity duration-300 ${
              imageLoaded ? 'block opacity-100' : 'hidden opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Audio player */}
      <div className="mt-4 flex flex-col gap-2">
        {/* Real DOM HTMLAudioElement for reliable mobile browser integration */}
        <audio
          ref={audioRef}
          key={`${audioSrc}-${audioAttempt}`}
          src={audioSrc}
          preload="auto"
          playsInline
          onLoadedMetadata={(e) => {
            const el = e.currentTarget
            if (el.duration && !isNaN(el.duration)) {
              setDuration(el.duration)
            }
          }}
          onCanPlay={() => {
            setIsBuffering(false)
            setAudioError(false)
          }}
          onCanPlayThrough={() => {
            setIsBuffering(false)
            setAudioError(false)
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget
            setCurrentTime(el.currentTime)
            if (el.duration && !isNaN(el.duration)) {
              setDuration(el.duration)
            }
          }}
          onWaiting={() => {
            setIsBuffering(true)
          }}
          onPlaying={() => {
            setIsBuffering(false)
            setPlaying(true)
            setAudioError(false)
          }}
          onPause={() => {
            setPlaying(false)
          }}
          onEnded={() => {
            setPlaying(false)
            setIsBuffering(false)
            setCurrentTime(0)
            if (audioRef.current) {
              audioRef.current.currentTime = 0
            }
          }}
          onError={(e) => {
            const target = e.currentTarget
            if (target.error && target.error.code !== 0) {
              setAudioError(true)
              setIsBuffering(false)
              setPlaying(false)
            }
          }}
          className={useNativeControls ? 'w-full h-11 mt-1' : 'hidden'}
          controls={useNativeControls}
        />

        {!useNativeControls && (
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Play/Pause Button - guaranteed min 48px touch target for mobile */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pause audio' : 'Play audio'}
              className="relative flex h-12 w-12 sm:h-14 sm:w-14 min-w-[48px] min-h-[48px] shrink-0 items-center justify-center rounded-full bg-electric-blue text-white shadow-md transition-all hover:bg-electric-blue/90 hover:shadow-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2 touch-manipulation cursor-pointer"
            >
              {isBuffering ? (
                <svg
                  className="h-6 w-6 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-90"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : playing ? (
                <svg
                  className="h-6 w-6 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6 text-white translate-x-0.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Scrubber track and time readout */}
            <div className="flex flex-1 flex-col gap-1.5 min-w-0">
              <div
                ref={progressTrackRef}
                onClick={handleSeek}
                onTouchStart={handleSeek}
                role="slider"
                tabIndex={0}
                aria-label="Audio progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                className="group relative flex h-6 w-full cursor-pointer items-center touch-manipulation select-none"
              >
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-blue-light transition-all group-hover:h-3">
                  <div
                    className="h-full rounded-full bg-electric-blue transition-[width] duration-150"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full border-2 border-white bg-electric-blue shadow-sm transition-opacity opacity-0 group-hover:opacity-100 sm:opacity-100"
                  style={{ left: `${progress * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                <span className="tabular-nums">
                  {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : '--:--'}
                </span>
                <div className="flex items-center gap-3">
                  {currentTime > 0 && (
                    <button
                      type="button"
                      onClick={handleReplay}
                      className="flex items-center gap-1 text-[11px] font-semibold text-electric-blue hover:underline cursor-pointer touch-manipulation"
                      title="Replay from beginning"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                      Replay
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setUseNativeControls(true)}
                    className="text-[11px] text-gray-400 hover:text-deep-blue transition-colors underline cursor-pointer touch-manipulation"
                    title="Switch to native browser audio controls"
                  >
                    Native player
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {useNativeControls && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setUseNativeControls(false)}
              className="text-[11px] font-medium text-electric-blue hover:underline cursor-pointer touch-manipulation"
            >
              Switch to custom player
            </button>
          </div>
        )}

        {audioError ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lab bg-red-50 p-3 text-xs text-seat-reserved border border-red-100">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>Audio playback encountered an issue on this device.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={retryAudio}
                className="font-semibold underline hover:no-underline cursor-pointer"
              >
                🔄 Retry Audio
              </button>
              {!useNativeControls && (
                <button
                  type="button"
                  onClick={() => setUseNativeControls(true)}
                  className="rounded bg-electric-blue/10 px-2 py-1 font-semibold text-electric-blue hover:bg-electric-blue/20 cursor-pointer"
                >
                  Try Native Player
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            🔁 Listen as many times as you need
          </p>
        )}
      </div>

      {/* Question + options */}
      <h2 className="mt-6 font-semibold text-deep-blue">{question.question}</h2>
      <div className="mt-4 flex flex-col gap-3">
        {question.options.map((option, index) => {
          const isSelected = selected === index
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(index)}
              className={`flex w-full items-center gap-3 rounded-lab border-2 bg-lab-white p-4 text-left transition-colors ${
                isSelected
                  ? 'border-electric-blue bg-blue-light'
                  : 'border-gray-200 hover:border-electric-blue/50'
              }`}
            >
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected ? 'border-electric-blue' : 'border-gray-300'
                }`}
              >
                {isSelected && (
                  <span className="h-2.5 w-2.5 rounded-full bg-electric-blue" />
                )}
              </span>
              <span
                className={
                  isSelected ? 'font-medium text-deep-blue' : 'text-gray-600'
                }
              >
                {option}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

export default function ListeningSection({
  questions,
  onComplete,
}: ListeningSectionProps) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<TestAnswer[]>([])

  if (questions.length === 0) return null

  const question = questions[current]
  const isLast = current === questions.length - 1

  function next() {
    if (selected === null || !question) return
    const updated: TestAnswer[] = [
      ...answers,
      { questionId: question.id, selectedAnswer: selected },
    ]
    if (isLast) {
      onComplete(updated)
    } else {
      setAnswers(updated)
      setSelected(null)
      setCurrent(current + 1)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      {/* Progress */}
      <p className="text-sm font-semibold text-electric-blue">
        🎧 Listening — Question {current + 1} of {questions.length}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-light">
        <motion.div
          animate={{ width: `${((current + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
          className="h-full rounded-full bg-electric-blue"
        />
      </div>

      {/* Instructional notice */}
      <div className="mt-5 flex items-start gap-3 rounded-lab border border-electric-blue/30 bg-blue-light/70 p-3.5 sm:p-4 text-left shadow-xs">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-electric-blue text-sm text-lab-white shadow-xs">
          💡
        </span>
        <div className="text-xs sm:text-sm leading-relaxed text-deep-blue">
          <p className="font-semibold text-deep-blue">Instructions</p>
          <p className="text-gray-700">
            For this test you need to listen to this record and watch the image carefully to answer the question.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id || current}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
        >
          <QuestionCard
            question={question}
            selected={selected}
            onSelect={setSelected}
          />
        </motion.div>
      </AnimatePresence>

      <Button
        size="lg"
        onClick={next}
        disabled={selected === null}
        className="mt-8 w-full sm:w-auto"
      >
        {isLast ? 'Next Section →' : 'Next Question'}
      </Button>
    </div>
  )
}
