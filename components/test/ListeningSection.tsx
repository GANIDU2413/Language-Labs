'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { ListeningQuestion, TestAnswer } from '@/types'

interface ListeningSectionProps {
  questions: ListeningQuestion[]
  /** Called with all collected answers when the section is finished */
  onComplete: (answers: TestAnswer[]) => void
}

export default function ListeningSection({
  questions,
  onComplete,
}: ListeningSectionProps) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<TestAnswer[]>([])

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioReady, setAudioReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)

  const question = questions[current]
  const isLast = current === questions.length - 1

  // (Re)create the audio element whenever the question changes
  useEffect(() => {
    if (!question) return
    setAudioReady(false)
    setPlaying(false)
    setProgress(0)
    setImageLoaded(false)

    const audio = new Audio(question.audioUrl)
    audioRef.current = audio

    const onReady = () => setAudioReady(true)
    const onTime = () =>
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
    const onEnded = () => {
      setPlaying(false)
      audio.currentTime = 0 // ready to replay from the start
    }

    audio.addEventListener('canplay', onReady)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.pause()
      audio.removeEventListener('canplay', onReady)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
      audioRef.current = null
    }
  }, [question])

  if (questions.length === 0) return null

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
    }
  }

  function next() {
    if (selected === null) return
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

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mt-6">
            {/* Image */}
            <div className="relative aspect-video overflow-hidden rounded-lab bg-blue-light">
              {!imageLoaded && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <LoadingSpinner size="md" />
                </span>
              )}
              <Image
                src={question.imageUrl}
                alt={question.question}
                fill
                sizes="(max-width: 672px) 100vw, 672px"
                className={`object-cover transition-opacity ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
              />
            </div>

            {/* Audio player */}
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={togglePlay}
                disabled={!audioReady}
                aria-label={playing ? 'Pause audio' : 'Play audio'}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-electric-blue text-lg text-lab-white transition-colors hover:bg-electric-blue/90 disabled:opacity-50"
              >
                {!audioReady ? (
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
            <p className="mt-2 text-xs text-gray-400">
              🔁 Listen as many times as you need
            </p>
          </Card>

          {/* Question + options */}
          <h2 className="mt-6 font-semibold text-deep-blue">
            {question.question}
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {question.options.map((option, index) => {
              const isSelected = selected === index
              return (
                <button
                  key={index}
                  onClick={() => setSelected(index)}
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
