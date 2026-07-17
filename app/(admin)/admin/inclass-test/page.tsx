'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  collection,
  onSnapshot,
  query,
  Timestamp,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { addDocument, getCollection, queryCollection } from '@/lib/firestore'
import { formatDate } from '@/lib/utils'
import { ReadingForm, VocabularyForm } from '@/components/admin/QuestionForms'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type {
  Booking,
  InClassResult,
  InClassTest,
  Lab,
  ReadingQuestion,
  VocabularyQuestion,
} from '@/types'

// ---------------------------------------------------------------------------
// Derived quiz status
// ---------------------------------------------------------------------------

type QuizStatus = 'scheduled' | 'active' | 'completed'

function quizStatus(test: InClassTest, now: Date): QuizStatus {
  const start = test.startTime.toDate()
  const end = new Date(start.getTime() + test.durationMinutes * 60 * 1000)
  if (now < start) return 'scheduled'
  if (now <= end) return 'active'
  return 'completed'
}

const statusBadge: Record<QuizStatus, { label: string; variant: 'info' | 'success' | 'warning' }> = {
  scheduled: { label: 'Scheduled', variant: 'info' },
  active: { label: 'Active', variant: 'success' },
  completed: { label: 'Completed', variant: 'warning' },
}

// ---------------------------------------------------------------------------
// Results view (live via onSnapshot; final = sorted table)
// ---------------------------------------------------------------------------

function ResultsView({
  test,
  students,
  mode,
  onClose,
}: {
  test: InClassTest
  students: Booking[]
  mode: 'live' | 'final'
  onClose: () => void
}) {
  const [results, setResults] = useState<InClassResult[] | null>(null)

  // onSnapshot keeps this updating in real time — no polling needed
  useEffect(() => {
    const q = query(
      collection(db, 'inClassResults'),
      where('testId', '==', test.id)
    )
    const unsubscribe = onSnapshot(q, (snap) =>
      setResults(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InClassResult)
      )
    )
    return unsubscribe
  }, [test.id])

  const byStudent = new Map(results?.map((r) => [r.studentId, r]) ?? [])

  const rows = students.map((student) => {
    const result = byStudent.get(student.studentId)
    const status = !result
      ? 'Not Started'
      : result.submittedAt
        ? 'Submitted'
        : 'In Progress'
    return { student, result, status }
  })

  const sorted =
    mode === 'final'
      ? [...rows].sort((a, b) => (b.result?.score ?? -1) - (a.result?.score ?? -1))
      : rows

  const submitted = rows.filter((r) => r.status === 'Submitted').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-blue/60 px-4">
      <Card className="max-h-[85vh] w-full max-w-lg overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-deep-blue">
              {mode === 'live' ? '🔴 Live Results' : '🏁 Final Results'} — {test.title}
            </h3>
            <p className="mt-0.5 text-sm text-gray-500">
              {submitted} / {students.length} submitted
              {mode === 'live' && ' · updates in real time'}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            ✕ Close
          </Button>
        </div>

        {!results ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-blue-light text-gray-500">
                {mode === 'final' && <th className="py-2 pr-2 font-medium">#</th>}
                <th className="py-2 pr-2 font-medium">Student</th>
                <th className="py-2 pr-2 font-medium">Status</th>
                <th className="py-2 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={row.student.studentId} className="border-b border-blue-light/60">
                  {mode === 'final' && (
                    <td className="py-2.5 pr-2 text-gray-400">{i + 1}</td>
                  )}
                  <td className="py-2.5 pr-2 font-medium text-deep-blue">
                    {row.student.studentName}
                  </td>
                  <td className="py-2.5 pr-2">
                    <span
                      className={`text-xs font-semibold ${
                        row.status === 'Submitted'
                          ? 'text-green-600'
                          : row.status === 'In Progress'
                            ? 'text-electric-blue'
                            : 'text-gray-400'
                      }`}
                    >
                      {row.status === 'In Progress' && '⏳ '}
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-bold text-deep-blue">
                    {row.result?.submittedAt
                      ? `${row.result.score} / ${row.result.totalQuestions}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const quizSchema = z.object({
  labId: z.string().min(1, 'Choose a lab'),
  title: z.string().min(2, 'Title is required'),
  duration: z.coerce
    .number()
    .int()
    .min(5, 'At least 5 minutes')
    .max(180, 'At most 180 minutes'),
  startTime: z.string().refine((v) => v && !Number.isNaN(Date.parse(v)), {
    message: 'Pick a valid date and time',
  }),
})
type QuizInput = z.input<typeof quizSchema>
type QuizForm = z.output<typeof quizSchema>

function InClassTestContent() {
  const labParam = useSearchParams().get('lab')

  const [labs, setLabs] = useState<Lab[]>([])
  const [tests, setTests] = useState<InClassTest[] | null>(null)
  const [bookingsByLab, setBookingsByLab] = useState<Record<string, Booking[]>>({})
  const [reading, setReading] = useState<ReadingQuestion[]>([])
  const [vocabulary, setVocabulary] = useState<VocabularyQuestion[]>([])
  const [questionTab, setQuestionTab] = useState<'reading' | 'vocabulary'>('reading')
  const [adderOpen, setAdderOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [viewing, setViewing] = useState<{
    test: InClassTest
    mode: 'live' | 'final'
  } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuizInput, unknown, QuizForm>({
    resolver: zodResolver(quizSchema),
    defaultValues: { labId: labParam ?? '' },
  })

  useEffect(() => {
    Promise.all([
      queryCollection<Lab>('labs', 'status', '==', 'ongoing'),
      getCollection<InClassTest>('inClassTests'),
      getCollection<Booking>('bookings'),
    ])
      .then(([ongoing, allTests, bookings]) => {
        setLabs(ongoing)
        setTests(
          allTests.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis())
        )
        const grouped: Record<string, Booking[]> = {}
        for (const b of bookings) {
          if (b.paymentStatus === 'confirmed') (grouped[b.labId] ??= []).push(b)
        }
        setBookingsByLab(grouped)
      })
      .catch(() => setTests([]))
  }, [])

  async function createQuiz(data: QuizForm) {
    setMessage('')
    if (reading.length + vocabulary.length === 0) {
      setMessage('❌ Add at least one question before creating the quiz.')
      return
    }
    try {
      const test: Omit<InClassTest, 'id'> = {
        labId: data.labId,
        title: data.title.trim(),
        reading,
        vocabulary,
        durationMinutes: data.duration,
        startTime: Timestamp.fromDate(new Date(data.startTime)),
        status: 'scheduled',
        createdAt: Timestamp.now(),
      }
      const id = await addDocument<InClassTest>('inClassTests', test)
      setTests((current) => [{ id, ...test }, ...(current ?? [])])
      setReading([])
      setVocabulary([])
      reset({ labId: data.labId, title: '', duration: undefined, startTime: '' })
      setMessage('✅ Quiz created — students in the lab will see it at start time.')
    } catch {
      setMessage('❌ Could not create the quiz. Please try again.')
    }
  }

  const now = new Date()
  const selectClass =
    'rounded-lab border border-gray-300 bg-lab-white px-4 py-2.5 text-deep-blue outline-none focus:border-deep-blue'

  if (!tests) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mt-6 grid grid-cols-1 items-start gap-8 xl:grid-cols-2">
      {/* -------------------------------------------------- Create quiz */}
      <Card>
        <h2 className="font-bold text-deep-blue">Create New Quiz</h2>
        <form
          onSubmit={handleSubmit(createQuiz)}
          noValidate
          className="mt-4 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="labId" className="text-sm font-medium text-deep-blue">
              Lab
            </label>
            <select id="labId" {...register('labId')} className={selectClass}>
              <option value="">Select an ongoing lab…</option>
              {labs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.name}
                </option>
              ))}
            </select>
            {errors.labId && (
              <p className="text-sm text-seat-reserved">{errors.labId.message}</p>
            )}
          </div>

          <Input
            label="Quiz Title"
            name="title"
            placeholder="Week 3 Checkpoint"
            required
            register={register('title')}
            error={errors.title?.message}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Duration (minutes)"
              name="duration"
              type="number"
              placeholder="30"
              required
              register={register('duration')}
              error={errors.duration?.message}
            />
            <Input
              label="Scheduled Start"
              name="startTime"
              type="datetime-local"
              required
              register={register('startTime')}
              error={errors.startTime?.message}
            />
          </div>

          {/* Question builder */}
          <div className="rounded-lab border border-blue-light p-4">
            <div className="flex gap-2">
              {(['reading', 'vocabulary'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setQuestionTab(t)
                    setAdderOpen(false)
                  }}
                  className={`rounded-lab px-3 py-1.5 text-xs font-semibold capitalize ${
                    questionTab === t
                      ? 'bg-electric-blue text-lab-white'
                      : 'bg-blue-light text-gray-600'
                  }`}
                >
                  {t} ({t === 'reading' ? reading.length : vocabulary.length})
                </button>
              ))}
            </div>

            {/* Added questions */}
            <ul className="mt-3 flex flex-col gap-2">
              {(questionTab === 'reading' ? reading : vocabulary).map((q) => (
                <li
                  key={q.id}
                  className="flex items-center justify-between gap-2 rounded-lab bg-blue-light/50 px-3 py-2 text-sm"
                >
                  <span className="truncate text-deep-blue">
                    {'sentence' in q
                      ? q.sentence
                      : (q.questions[0]?.question ?? '')}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      questionTab === 'reading'
                        ? setReading((c) => c.filter((x) => x.id !== q.id))
                        : setVocabulary((c) => c.filter((x) => x.id !== q.id))
                    }
                    className="font-bold text-seat-reserved"
                    aria-label="Remove question"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            {!adderOpen && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => setAdderOpen(true)}
              >
                Add {questionTab === 'reading' ? 'Reading' : 'Vocabulary'} Question
              </Button>
            )}
          </div>

          {message && (
            <p className="rounded-lab bg-blue-light px-4 py-3 text-sm text-deep-blue">
              {message}
            </p>
          )}

          <Button type="submit" size="lg" loading={isSubmitting}>
            Create Quiz
          </Button>
        </form>

        {/* Question adder lives outside the quiz <form> (forms can't nest) */}
        {adderOpen && (
          <div className="mt-4 rounded-lab border-2 border-electric-blue/40 p-4">
            {questionTab === 'reading' ? (
              <ReadingForm
                saving={false}
                onSave={(q) => {
                  setReading((c) => [...c, q])
                  setAdderOpen(false)
                }}
                onCancel={() => setAdderOpen(false)}
              />
            ) : (
              <VocabularyForm
                saving={false}
                onSave={(q) => {
                  setVocabulary((c) => [...c, q])
                  setAdderOpen(false)
                }}
                onCancel={() => setAdderOpen(false)}
              />
            )}
          </div>
        )}
      </Card>

      {/* -------------------------------------------------- Existing quizzes */}
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-deep-blue">Existing Quizzes</h2>
        {tests.length === 0 ? (
          <p className="text-sm text-gray-400">No quizzes created yet.</p>
        ) : (
          labs.map((lab) => {
              const labTests = tests.filter((t) => t.labId === lab.id)
              if (labTests.length === 0) return null
              return (
                <div key={lab.id}>
                  <h3 className="text-sm font-semibold text-gray-500">
                    {lab.name}
                  </h3>
                  <div className="mt-2 flex flex-col gap-3">
                    {labTests.map((test) => {
                      const status = quizStatus(test, now)
                      const badge = statusBadge[status]
                      return (
                        <Card key={test.id} className="p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-deep-blue">
                                {test.title}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {formatDate(test.startTime.toDate())} ·{' '}
                                {test.startTime
                                  .toDate()
                                  .toLocaleTimeString('en-GB', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}{' '}
                                · {test.durationMinutes} min ·{' '}
                                {test.reading.length + test.vocabulary.length}{' '}
                                questions
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                              {status === 'active' && (
                                <Button
                                  size="sm"
                                  onClick={() => setViewing({ test, mode: 'live' })}
                                >
                                  View Live Results
                                </Button>
                              )}
                              {status === 'completed' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setViewing({ test, mode: 'final' })}
                                >
                                  View Final Results
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )
            })
        )}
        {/* Tests belonging to labs that are not ongoing anymore */}
        {tests.some((t) => !labs.find((l) => l.id === t.labId)) && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500">Other labs</h3>
            <div className="mt-2 flex flex-col gap-3">
              {tests
                .filter((t) => !labs.find((l) => l.id === t.labId))
                .map((test) => {
                  const status = quizStatus(test, now)
                  const badge = statusBadge[status]
                  return (
                    <Card key={test.id} className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-deep-blue">{test.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                          {status === 'completed' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setViewing({ test, mode: 'final' })}
                            >
                              View Final Results
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      {viewing && (
        <ResultsView
          test={viewing.test}
          students={(bookingsByLab[viewing.test.labId] ?? []).sort(
            (a, b) => a.seatNumber - b.seatNumber
          )}
          mode={viewing.mode}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}

export default function InClassTestPage() {
  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-deep-blue">In-Class Test ⏱️</h1>
      <p className="mt-1 text-sm text-gray-500">
        Build time-bound Reading + Vocabulary quizzes for enrolled students.
      </p>
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <InClassTestContent />
      </Suspense>
    </div>
  )
}
