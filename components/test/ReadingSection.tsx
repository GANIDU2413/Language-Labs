'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import type { ReadingQuestion, TestAnswer } from '@/types'

interface ReadingSectionProps {
  questions: ReadingQuestion[]
  /** Called with all collected answers when the section is finished */
  onComplete: (answers: TestAnswer[]) => void
}

export default function ReadingSection({
  questions,
  onComplete,
}: ReadingSectionProps) {
  // Flatten passages into one question per step (each passage has 2–3 questions)
  const steps = useMemo(
    () =>
      questions.flatMap((passage) =>
        passage.questions.map((question) => ({
          paragraph: passage.paragraph,
          question,
        }))
      ),
    [questions]
  )

  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<TestAnswer[]>([])

  if (steps.length === 0) return null
  const step = steps[current]
  const isLast = current === steps.length - 1

  function next() {
    if (selected === null) return
    const updated: TestAnswer[] = [
      ...answers,
      { questionId: step.question.id, selectedAnswer: selected },
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
        📖 Reading — Question {current + 1} of {steps.length}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-light">
        <motion.div
          animate={{ width: `${((current + 1) / steps.length) * 100}%` }}
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
          {/* Passage */}
          <Card className="mt-6">
            <p className="leading-relaxed text-deep-blue">{step.paragraph}</p>
          </Card>

          {/* Question */}
          <h2 className="mt-6 font-semibold text-deep-blue">
            {step.question.question}
          </h2>

          {/* Options as clickable cards */}
          <div className="mt-4 flex flex-col gap-3">
            {step.question.options.map((option, index) => {
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
                      isSelected
                        ? 'border-electric-blue'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <span className="h-2.5 w-2.5 rounded-full bg-electric-blue" />
                    )}
                  </span>
                  <span
                    className={
                      isSelected
                        ? 'font-medium text-deep-blue'
                        : 'text-gray-600'
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
