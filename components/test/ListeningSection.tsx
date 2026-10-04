'use client'

import { useEffect, useRef, useState } from 'react'
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
  const [audioReady, setAudioReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [audioError, setAudioError] = useState(false)

  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [audioAttempt, setAudioAttempt] = useState(0)
  const [imageAttempt, setImageAttempt] = useState(0)

  const audioSrc = getCachedMediaUrl(question.audioUrl)
  const imageSrc = getCachedMediaUrl(question.imageUrl)
  const isBlobImage = imageSrc.startsWith('blob:')

  // Audio setup and event management
  useEffect(() => {
    let unmounted = false
    const audio = new Audio(audioSrc)
    audioRef.current = audio

    const onReady = () => {
      if (!unmounted) {
        setAudioReady(true)
        setAudioError(false)
      }
    }

    const onTime = () => {
      if (!unmounted && audio.duration) {
        setProgress(audio.currentTime / audio.duration)
      }
    }

    const onEnded = () => {
      if (!unmounted) {
        setPlaying(false)
        audio.currentTime = 0
      }
    }

    const onError = () => {
      if (!unmounted) {
        setAudioError(true)
        setAudioReady(false)
        setPlaying(false)
      }
    }

    audio.addEventListener('canplaythrough', onReady)
    audio.addEventListener('canplay', onReady)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    // Check if media is already sufficiently buffered from cache
    if (audio.readyState >= 3) {
      onReady()
    }

    return () => {
      unmounted = true
      audio.pause()
      audio.removeEventListener('canplaythrough', onReady)
      audio.removeEventListener('canplay', onReady)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audioRef.current = null
    }
  }, [audioSrc, audioAttempt])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => {
          setPlaying(false)
          setAudioError(true)
        })
    }
  }

  function retryAudio() {
    setAudioError(false)
    setAudioReady(false)
    setPlaying(false)
    setProgress(0)
    setAudioAttempt((prev) => prev + 1)
  }

  function retryImage() {
    setImageError(false)
    setImageLoaded(false)
    setImageAttempt((prev) => prev + 1)
  }

  return (
    <Card className="mt-6">
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
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!audioReady || audioError}
            aria-label={playing ? 'Pause audio' : 'Play audio'}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-electric-blue text-lg text-lab-white transition-colors hover:bg-electric-blue/90 disabled:opacity-50"
          >
            {audioError ? (
              '⚠️'
            ) : !audioReady ? (
              <LoadingSpinner size="sm" />
            ) : playing ? (
              '❚❚'
            ) : (
              <span className="pl-0.5">▶</span>
            )}
          </button>

          <div className="h-2 flex-1 overflow-hidden rounded-full bg-blue-light">
            <div
              className="h-full rounded-full bg-electric-blue transition-[width] duration-200"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {audioError ? (
          <div className="flex items-center justify-between rounded-lab bg-red-50 px-3 py-1.5 text-xs text-seat-reserved">
            <span>Audio playback encountered an issue.</span>
            <button
              type="button"
              onClick={retryAudio}
              className="font-semibold underline hover:no-underline"
            >
              🔄 Retry Audio
            </button>
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
