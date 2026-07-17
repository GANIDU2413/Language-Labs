'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { queryCollection } from '@/lib/firestore'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import ReadingSection from '@/components/test/ReadingSection'
import VocabularySection from '@/components/test/VocabularySection'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ErrorState from '@/components/ui/ErrorState'
import { CardGridSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { toast } from '@/hooks/useToast'
import type { InClassResult, InClassTest, TestAnswer } from '@/types'

type TestStatus = 'upcoming' | 'active' | 'completed'

function testStatus(test: InClassTest, now: Date): TestStatus {
  const start = test.startTime.toDate()
  const end = new Date(start.getTime() + test.durationMinutes * 60 * 1000)
  if (now < start) return 'upcoming'
  if (now <= end) return 'active'
  return 'completed'
}

function endTime(test: InClassTest): Date {
  return new Date(
    test.startTime.toDate().getTime() + test.durationMinutes * 60 * 1000
  )
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function encouragement(totalScore: number): string {
  if (totalScore >= 80) return 'Outstanding experiment, scientist! 🏆 Keep it up!'
  if (totalScore >= 60) return 'Great work! Your English is clearly growing. 🌱'
  if (totalScore >= 40)
    return 'Good effort! Every question you tried taught you something. 💪'
  return "Don't worry — in this lab, every attempt is progress. We'll get there together! 🔬"
}

interface FinishedScores {
  readingCorrect: number
  readingTotal: number
  vocabCorrect: number
  vocabTotal: number
  totalScore: number
}

export default function StudentTestsPage() {
  const { user, firebaseUser } = useAuth()
  const [tests, setTests] = useState<InClassTest[] | null>(null)
  const [results, setResults] = useState<Record<string, InClassResult>>({})
  const [taking, setTaking] = useState<InClassTest | null>(null)
  const [phase, setPhase] = useState<'reading' | 'vocabulary'>('reading')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [finished, setFinished] = useState<FinishedScores | null>(null)
  const [now, setNow] = useState(new Date())
  const readingAnswersRef = useRef<TestAnswer[]>([])
  const vocabAnswersRef = useRef<TestAnswer[]>([])
  const submittedRef = useRef(false)

  const [fetchError, setFetchError] = useState(false)

  // Load tests for the student's lab + their existing results
  function loadData() {
    if (!user?.enrolledLabId || !firebaseUser) return
    setFetchError(false)
    setTests(null)
    Promise.all([
      queryCollection<InClassTest>(
        'inClassTests',
        'labId',
        '==',
        user.enrolledLabId
      ),
      queryCollection<InClassResult>(
        'inClassResults',
        'studentId',
        '==',
        firebaseUser.uid
      ),
    ])
      .then(([labTests, myResults]) => {
        setTests(
          labTests.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis())
        )
        setResults(
          Object.fromEntries(myResults.map((r) => [r.testId, r]))
        )
      })
      .catch(() => setFetchError(true))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadData, [user, firebaseUser])

  // Ticker: refreshes statuses on the list and drives the in-test countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
      if (taking && !finished) {
        const remaining = Math.max(
          0,
          Math.floor((endTime(taking).getTime() - Date.now()) / 1000)
        )
        setSecondsLeft(remaining)
        if (remaining === 0) {
          // Time's up — submit whatever has been answered
          void submitTest()
        }
      }
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taking, finished])

  async function startTest(test: InClassTest) {
    if (!firebaseUser || !user?.enrolledLabId) return
    submittedRef.current = false
    readingAnswersRef.current = []
    vocabAnswersRef.current = []
    setFinished(null)
    setPhase(test.reading.length > 0 ? 'reading' : 'vocabulary')
    setSecondsLeft(
      Math.max(0, Math.floor((endTime(test).getTime() - Date.now()) / 1000))
    )
    setTaking(test)
    // Mark as started — the admin's live view shows "In Progress"
    try {
      await setDoc(
        doc(db, 'inClassResults', `${test.id}_${firebaseUser.uid}`),
        {
          testId: test.id,
          labId: user.enrolledLabId,
          studentId: firebaseUser.uid,
          startedAt: Timestamp.now(),
        },
        { merge: true }
      )
    } catch {
      // Starting anyway — the submit write is the one that matters
    }
  }

  async function submitTest() {
    const test = taking
    if (!test || !firebaseUser || submittedRef.current) return
    submittedRef.current = true

    const readingQuestions = test.reading.flatMap((p) => p.questions)
    const readingCorrect = readingAnswersRef.current.filter((a) => {
      const q = readingQuestions.find((x) => x.id === a.questionId)
      return q?.correctIndex === a.selectedAnswer
    }).length
    const vocabCorrect = vocabAnswersRef.current.filter((a) => {
      const q = test.vocabulary.find((x) => x.id === a.questionId)
      return q?.correctAnswer === a.selectedAnswer
    }).length

    const totalQuestions = readingQuestions.length + test.vocabulary.length
    const score = readingCorrect + vocabCorrect
    const totalScore = totalQuestions
      ? Math.round((score / totalQuestions) * 100)
      : 0

    const result: Omit<InClassResult, 'id'> = {
      testId: test.id,
      labId: test.labId,
      studentId: firebaseUser.uid,
      readingScore: readingCorrect,
      vocabularyScore: vocabCorrect,
      score,
      totalQuestions,
      totalScore,
      submittedAt: Timestamp.now(),
    }

    try {
      await setDoc(
        doc(db, 'inClassResults', `${test.id}_${firebaseUser.uid}`),
        result,
        { merge: true }
      )
    } catch {
      // Show results anyway — the attempt shouldn't vanish on a network blip
      toast.error(
        'Your score is shown, but saving it failed — please tell your mentor.'
      )
    }

    setResults((current) => ({
      ...current,
      [test.id]: { id: `${test.id}_${firebaseUser.uid}`, ...result },
    }))
    setFinished({
      readingCorrect,
      readingTotal: readingQuestions.length,
      vocabCorrect,
      vocabTotal: test.vocabulary.length,
      totalScore,
    })
  }

  if (fetchError) {
    return (
      <div className="px-4 py-8 sm:px-8">
        <ErrorState onRetry={loadData} />
      </div>
    )
  }

  if (!tests || !user) {
    return (
      <div className="px-4 py-8 sm:px-8">
        <Skeleton className="h-8 w-48" />
        <div className="mt-8">
          <CardGridSkeleton
            count={4}
            cardClassName="h-32"
            gridClassName="grid-cols-1 lg:grid-cols-2"
          />
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------ result view
  if (taking && finished) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="text-center">
            <p className="text-4xl">🧪</p>
            <h1 className="mt-2 text-xl font-bold text-deep-blue">
              {taking.title} — Results
            </h1>
            <div className="mt-5 flex flex-col gap-2 text-sm">
              <p className="flex justify-between rounded-lab bg-blue-light/60 px-4 py-2.5">
                <span className="text-gray-600">📖 Reading</span>
                <span className="font-bold text-deep-blue">
                  {finished.readingCorrect} / {finished.readingTotal} correct
                </span>
              </p>
              <p className="flex justify-between rounded-lab bg-blue-light/60 px-4 py-2.5">
                <span className="text-gray-600">📚 Vocabulary</span>
                <span className="font-bold text-deep-blue">
                  {finished.vocabCorrect} / {finished.vocabTotal} correct
                </span>
              </p>
            </div>
            <p className="mt-5 text-3xl font-bold text-electric-blue">
              {finished.totalScore}%
            </p>
            <p className="mt-3 text-sm text-gray-600">
              {encouragement(finished.totalScore)}
            </p>
            <Button className="mt-6" onClick={() => setTaking(null)}>
              Back to Tests
            </Button>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ------------------------------------------------------------ taking view
  if (taking) {
    return (
      <div>
        {/* Countdown bar */}
        <div className="sticky top-0 z-40 bg-deep-blue px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <p className="text-sm font-semibold text-lab-white">
              ⏱️ {taking.title}
            </p>
            <p
              className={`font-mono text-lg font-bold ${
                secondsLeft <= 60 ? 'text-seat-reserved' : 'text-electric-blue'
              }`}
              aria-live="polite"
            >
              {formatClock(secondsLeft)}
            </p>
          </div>
        </div>

        {phase === 'reading' && taking.reading.length > 0 ? (
          <ReadingSection
            questions={taking.reading}
            onComplete={(answers) => {
              readingAnswersRef.current = answers
              if (taking.vocabulary.length > 0) setPhase('vocabulary')
              else void submitTest()
            }}
          />
        ) : (
          <VocabularySection
            questions={taking.vocabulary}
            onComplete={(answers) => {
              vocabAnswersRef.current = answers
              void submitTest()
            }}
          />
        )}
      </div>
    )
  }

  // -------------------------------------------------------------- list view
  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-deep-blue">In-Class Tests ✏️</h1>
      <p className="mt-1 text-sm text-gray-500">
        Quizzes from your lab — join while they&apos;re live!
      </p>

      {tests.length === 0 ? (
        <Card className="mt-10 max-w-md text-center">
          <p className="text-4xl">📭</p>
          <p className="mt-3 font-semibold text-deep-blue">No tests yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Your mentor will schedule in-class tests as the lab progresses.
          </p>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {tests.map((test) => {
            const status = testStatus(test, now)
            const result = results[test.id]
            const submitted = !!result?.submittedAt
            const questionCount =
              test.reading.flatMap((p) => p.questions).length +
              test.vocabulary.length

            return (
              <Card
                key={test.id}
                className={status === 'upcoming' ? 'bg-gray-50' : ''}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-deep-blue">{test.title}</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDate(test.startTime.toDate())} ·{' '}
                      {test.startTime.toDate().toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {test.durationMinutes} min · {questionCount} questions
                    </p>
                  </div>

                  {status === 'active' && !submitted && (
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      <Badge variant="success">🔴 LIVE NOW</Badge>
                    </motion.span>
                  )}
                  {status === 'upcoming' && (
                    <Badge variant="info">Upcoming</Badge>
                  )}
                  {submitted && (
                    <Badge variant="success">
                      Score: {result.totalScore}%
                    </Badge>
                  )}
                  {status === 'completed' && !submitted && (
                    <Badge variant="danger">Missed</Badge>
                  )}
                </div>

                {status === 'active' && !submitted && (
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-500">
                      ⏳ Ends in{' '}
                      <span className="font-semibold text-deep-blue">
                        {formatClock(
                          Math.max(
                            0,
                            Math.floor(
                              (endTime(test).getTime() - now.getTime()) / 1000
                            )
                          )
                        )}
                      </span>
                    </p>
                    <Button onClick={() => startTest(test)}>Start Test</Button>
                  </div>
                )}
                {status === 'upcoming' && (
                  <p className="mt-3 text-sm text-gray-400">
                    Come back at the scheduled time to take this test.
                  </p>
                )}
                {submitted && result && (
                  <p className="mt-3 text-sm text-gray-500">
                    📖 {result.readingScore} correct · 📚{' '}
                    {result.vocabularyScore} correct ·{' '}
                    {result.score} / {result.totalQuestions} total
                  </p>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
