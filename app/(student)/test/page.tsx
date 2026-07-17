'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Timestamp } from 'firebase/firestore'
import { addDocument, getCollection } from '@/lib/firestore'
import { useAuth } from '@/hooks/useAuth'
import TestRules from '@/components/test/TestRules'
import ReadingSection from '@/components/test/ReadingSection'
import VocabularySection from '@/components/test/VocabularySection'
import ListeningSection from '@/components/test/ListeningSection'
import SpeakingSection from '@/components/test/SpeakingSection'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import type {
  ListeningQuestion,
  ReadingQuestion,
  TestAnswer,
  TestQuestions,
  TestResult,
  VocabularyQuestion,
} from '@/types'

type Stage =
  | 'rules'
  | 'reading'
  | 'vocabulary'
  | 'listening'
  | 'speaking'
  | 'submitting'

const questionStages = ['reading', 'vocabulary', 'listening', 'speaking'] as const
type QuestionStage = (typeof questionStages)[number]

const stageLabels: Record<QuestionStage, string> = {
  reading: '📖 Reading',
  vocabulary: '📚 Vocabulary',
  listening: '🎧 Listening',
  speaking: '🎙️ Speaking',
}

// ---------------------------------------------------------------------------
// Scoring — percentages, comparing collected answers to the question bank
// ---------------------------------------------------------------------------

function scoreReading(questions: ReadingQuestion[], answers: TestAnswer[]) {
  const flat = questions.flatMap((passage) => passage.questions)
  const correct = answers.filter((answer) => {
    const question = flat.find((q) => q.id === answer.questionId)
    return question?.correctIndex === answer.selectedAnswer
  }).length
  return flat.length ? Math.round((correct / flat.length) * 100) : 0
}

function scoreVocabulary(
  questions: VocabularyQuestion[],
  answers: TestAnswer[]
) {
  const correct = answers.filter((answer) => {
    const question = questions.find((q) => q.id === answer.questionId)
    return question?.correctAnswer === answer.selectedAnswer
  }).length
  return questions.length ? Math.round((correct / questions.length) * 100) : 0
}

function scoreListening(
  questions: ListeningQuestion[],
  answers: TestAnswer[]
) {
  const correct = answers.filter((answer) => {
    const question = questions.find((q) => q.id === answer.questionId)
    return question?.correctIndex === answer.selectedAnswer
  }).length
  return questions.length ? Math.round((correct / questions.length) * 100) : 0
}

// ---------------------------------------------------------------------------

export default function LevelTestPage() {
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading } = useAuth()

  const [stage, setStage] = useState<Stage>('rules')
  const [micGranted, setMicGranted] = useState(false)
  const [questions, setQuestions] = useState<TestQuestions | null>(null)
  const [answers, setAnswers] = useState<{
    reading: TestAnswer[]
    vocabulary: TestAnswer[]
    listening: TestAnswer[]
  }>({ reading: [], vocabulary: [], listening: [] })
  const [submitError, setSubmitError] = useState(false)
  const [speakingUrl, setSpeakingUrl] = useState<string | null>(null)

  // Must be logged in to take the test
  useEffect(() => {
    if (!authLoading && !firebaseUser) router.push('/login')
  }, [authLoading, firebaseUser, router])

  // Load the question bank while the student reads the rules
  useEffect(() => {
    getCollection<TestQuestions>('testQuestions')
      .then((docs) => setQuestions(docs[0] ?? null))
      .catch(() => setQuestions(null))
  }, [])

  async function finishTest(speakingFileUrl: string | null) {
    setStage('submitting')
    setSubmitError(false)
    setSpeakingUrl(speakingFileUrl)
    if (!questions || !firebaseUser) return

    try {
      const result: Omit<TestResult, 'id'> = {
        studentId: firebaseUser.uid,
        readingScore: scoreReading(questions.reading, answers.reading),
        vocabularyScore: scoreVocabulary(
          questions.vocabulary,
          answers.vocabulary
        ),
        listeningScore: scoreListening(questions.listening, answers.listening),
        speakingScore: null,
        speakingFileUrl,
        reviewedByAdmin: false,
        createdAt: Timestamp.now(),
      }
      await addDocument<TestResult>('testResults', result)

      // Notify the admin — non-blocking, results are already saved
      try {
        await fetch('/api/notify-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'speaking_review',
            studentName: user?.fullName ?? firebaseUser.email,
            studentEmail: firebaseUser.email,
            message:
              speakingFileUrl === null
                ? 'Note: the student completed the test without a speaking recording (microphone was not available).'
                : undefined,
          }),
        })
      } catch {
        // Admin email failing should never block the student
      }

      router.push('/test/results')
    } catch {
      setSubmitError(true)
    }
  }

  // ---- Guard rails -------------------------------------------------------

  if (authLoading || (stage !== 'rules' && !firebaseUser)) {
    return <LoadingSpinner size="lg" fullPage />
  }

  // Question bank missing (admin hasn't uploaded it yet)
  if (stage !== 'rules' && stage !== 'submitting' && !questions) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="max-w-md text-center text-gray-600">
          The level test isn&apos;t ready yet — please check back soon or
          contact us for help. 🧪
        </p>
      </div>
    )
  }

  const currentStep = questionStages.indexOf(stage as QuestionStage)

  return (
    <div className="min-h-screen bg-blue-light/40">
      {/* Sticky progress header during question stages */}
      {currentStep >= 0 && (
        <div className="sticky top-0 z-40 bg-lab-white/90 shadow-sm backdrop-blur">
          <div className="mx-auto max-w-2xl px-4 py-3">
            <div className="flex items-center justify-between">
              {questionStages.map((s, i) => (
                <span
                  key={s}
                  className={`text-xs font-semibold sm:text-sm ${
                    i < currentStep
                      ? 'text-electric-blue/60'
                      : i === currentStep
                        ? 'text-electric-blue'
                        : 'text-gray-300'
                  }`}
                >
                  {stageLabels[s]}
                </span>
              ))}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-light">
              <motion.div
                animate={{
                  width: `${((currentStep + 1) / questionStages.length) * 100}%`,
                }}
                transition={{ duration: 0.4 }}
                className="h-full rounded-full bg-electric-blue"
              />
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
        >
          {stage === 'rules' && (
            <TestRules
              onStart={() => setStage('reading')}
              onMicGranted={setMicGranted}
            />
          )}

          {stage === 'reading' && questions && (
            <ReadingSection
              questions={questions.reading}
              onComplete={(reading) => {
                setAnswers((a) => ({ ...a, reading }))
                setStage('vocabulary')
              }}
            />
          )}

          {stage === 'vocabulary' && questions && (
            <VocabularySection
              questions={questions.vocabulary}
              onComplete={(vocabulary) => {
                setAnswers((a) => ({ ...a, vocabulary }))
                setStage('listening')
              }}
            />
          )}

          {stage === 'listening' && questions && (
            <ListeningSection
              questions={questions.listening}
              onComplete={(listening) => {
                setAnswers((a) => ({ ...a, listening }))
                setStage('speaking')
              }}
            />
          )}

          {stage === 'speaking' && questions && firebaseUser && (
            <SpeakingSection
              userId={firebaseUser.uid}
              question={questions.speaking.question}
              micGranted={micGranted}
              onComplete={finishTest}
            />
          )}

          {stage === 'submitting' && (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
              {submitError ? (
                <>
                  <p className="max-w-md text-center text-gray-600">
                    Something went wrong while saving your results. Don&apos;t
                    worry — your answers are still here.
                  </p>
                  <Button onClick={() => finishTest(speakingUrl)}>
                    Try Again
                  </Button>
                </>
              ) : (
                <>
                  <LoadingSpinner size="lg" />
                  <p className="font-semibold text-deep-blue">
                    Calculating your results… 🧮
                  </p>
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
