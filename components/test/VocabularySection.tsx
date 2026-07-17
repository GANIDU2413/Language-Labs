'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { shuffleArray } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import type { TestAnswer, VocabularyQuestion } from '@/types'

interface VocabularySectionProps {
  questions: VocabularyQuestion[]
  /** Called with all collected answers when the section is finished */
  onComplete: (answers: TestAnswer[]) => void
}

/** Render the sentence with the ___ blank highlighted (and filled once a word is picked) */
function SentenceWithBlank({
  sentence,
  selectedWord,
}: {
  sentence: string
  selectedWord: string | null
}) {
  const parts = sentence.split(/_{2,}/)
  return (
    <p className="text-lg leading-relaxed text-deep-blue">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="mx-1 inline-block min-w-16 border-b-2 border-electric-blue px-1 text-center font-bold text-electric-blue">
              {selectedWord ?? ' '}
            </span>
          )}
        </span>
      ))}
    </p>
  )
}

export default function VocabularySection({
  questions,
  onComplete,
}: VocabularySectionProps) {
  // Shuffle every question's options once on mount (Fisher–Yates) so the
  // correct answer isn't always the first card
  const [shuffledOptions] = useState<string[][]>(() =>
    questions.map((q) => shuffleArray(q.options))
  )

  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answers, setAnswers] = useState<TestAnswer[]>([])

  if (questions.length === 0) return null
  const question = questions[current]
  const options = shuffledOptions[current]
  const isLast = current === questions.length - 1

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
        📚 Vocabulary — Question {current + 1} of {questions.length}
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
          {/* Sentence with the blank */}
          <Card className="mt-6">
            <SentenceWithBlank
              sentence={question.sentence}
              selectedWord={selected}
            />
          </Card>

          <h2 className="mt-6 text-sm font-medium text-gray-500">
            Pick the word that fits the blank:
          </h2>

          {/* Word option cards */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {options.map((word) => {
              const isSelected = selected === word
              return (
                <button
                  key={word}
                  onClick={() => setSelected(word)}
                  className={`rounded-lab border-2 bg-lab-white p-4 text-center font-medium transition-colors ${
                    isSelected
                      ? 'border-electric-blue bg-blue-light text-deep-blue'
                      : 'border-gray-200 text-gray-600 hover:border-electric-blue/50'
                  }`}
                >
                  {word}
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
