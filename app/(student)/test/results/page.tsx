'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getDocument, queryCollection } from '@/lib/firestore'
import { generateTestReportPdf } from '@/lib/pdf'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { toast } from '@/hooks/useToast'
import type { TestResult } from '@/types'

const levelBands = [
  {
    max: 40,
    label: 'Beginner Lab',
    recommendation:
      'We recommend starting with the foundations — everyday words, simple sentences and lots of gentle speaking practice. The Beginner Lab is exactly the safe space to build your base, one small experiment at a time.',
  },
  {
    max: 60,
    label: 'Elementary Lab',
    recommendation:
      'You already have a working base of English! The Elementary Lab will strengthen your grammar and vocabulary while getting you talking more confidently in everyday situations.',
  },
  {
    max: 80,
    label: 'Intermediate Lab',
    recommendation:
      'You handle everyday English well — now it is time to level up. The Intermediate Lab focuses on fluent conversation, richer vocabulary and the confidence to speak in any situation.',
  },
  {
    max: 100,
    label: 'Upper Intermediate Lab',
    recommendation:
      'Impressive results! The Upper Intermediate Lab will polish your fluency, sharpen your professional English and prepare you for interviews and presentations.',
  },
]

function getLevelBand(combined: number) {
  return levelBands.find((band) => combined <= band.max) ?? levelBands[0]
}

function getTimestampMillis(val: unknown): number {
  if (!val) return 0
  if (typeof val === 'object' && val !== null) {
    if (
      'toMillis' in val &&
      typeof (val as { toMillis: () => number }).toMillis === 'function'
    ) {
      return (val as { toMillis: () => number }).toMillis()
    }
    if (
      'seconds' in val &&
      typeof (val as { seconds: number }).seconds === 'number'
    ) {
      return (val as { seconds: number }).seconds * 1000
    }
    if (val instanceof Date) {
      return val.getTime()
    }
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const time = new Date(val).getTime()
    return isNaN(time) ? 0 : time
  }
  return 0
}

function getResultDate(val: unknown): Date {
  if (!val) return new Date()
  if (typeof val === 'object' && val !== null) {
    if (
      'toDate' in val &&
      typeof (val as { toDate: () => Date }).toDate === 'function'
    ) {
      return (val as { toDate: () => Date }).toDate()
    }
    if (
      'seconds' in val &&
      typeof (val as { seconds: number }).seconds === 'number'
    ) {
      return new Date((val as { seconds: number }).seconds * 1000)
    }
    if (val instanceof Date) {
      return val
    }
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

export default function TestResultsPage() {
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading } = useAuth()
  const [result, setResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!firebaseUser) {
      router.push('/login')
      return
    }

    const currentUid = firebaseUser.uid
    let isMounted = true

    async function loadResults() {
      // 1. Try URL param ID if present (e.g. redirected from test completion)
      const urlParams =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : null
      const resultId = urlParams?.get('id')

      if (resultId) {
        try {
          const docResult = await getDocument<TestResult>(
            'testResults',
            resultId
          )
          if (docResult && isMounted) {
            setResult(docResult)
            setLoading(false)
            return
          }
        } catch {
          // Fall through to query
        }
      }

      // 2. Try sessionStorage cache if fresh test was just submitted
      if (typeof window !== 'undefined') {
        try {
          const cached = sessionStorage.getItem('ll_latest_result')
          if (cached) {
            const parsed = JSON.parse(cached)
            if (parsed && parsed.studentId === currentUid && isMounted) {
              setResult(parsed as TestResult)
              setLoading(false)
            }
          }
        } catch {
          // Ignore parse errors
        }
      }

      // 3. Query all results for student
      try {
        const results = await queryCollection<TestResult>(
          'testResults',
          'studentId',
          '==',
          currentUid
        )

        if (!isMounted) return

        if (results.length > 0) {
          results.sort(
            (a, b) =>
              getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt)
          )
          setResult(results[0])
        }
      } catch (err) {
        console.error('Error querying test results:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadResults()

    return () => {
      isMounted = false
    }
  }, [authLoading, firebaseUser, router])

  if (authLoading || loading) return <LoadingSpinner size="lg" fullPage />

  if (!result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-blue-light/40 px-4">
        <Card className="max-w-md p-8 text-center">
          <p className="text-4xl">🧪</p>
          <h2 className="mt-3 text-lg font-bold text-deep-blue">
            No Test Results Found
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We couldn&apos;t find a test result for your account yet. If you
            just completed the test, click refresh below.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              variant="secondary"
              onClick={() => {
                setLoading(true)
                window.location.reload()
              }}
            >
              🔄 Refresh
            </Button>
            <Link href="/test">
              <Button>Take the Level Test</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const readingScore =
    typeof result.readingScore === 'number' ? result.readingScore : 0
  const vocabularyScore =
    typeof result.vocabularyScore === 'number' ? result.vocabularyScore : 0
  const listeningScore =
    typeof result.listeningScore === 'number' ? result.listeningScore : 0

  const sections = [
    { name: 'Reading', icon: '📖', score: readingScore },
    { name: 'Vocabulary', icon: '📚', score: vocabularyScore },
    { name: 'Listening', icon: '🎧', score: listeningScore },
  ]
  const combined = Math.round(
    (readingScore + vocabularyScore + listeningScore) / 3
  )
  const band = getLevelBand(combined)
  const strengths = sections.filter((s) => s.score >= 70)
  const improvements = sections.filter((s) => s.score < 70)

  async function downloadPdf() {
    if (!result) return
    setDownloading(true)
    try {
      await generateTestReportPdf({
        studentName:
          user?.fullName || firebaseUser?.email || 'LANGUAGE LABS Student',
        date: formatDate(getResultDate(result.createdAt)),
        readingScore,
        vocabularyScore,
        listeningScore,
        levelLabel: band.label,
        strengths: strengths.map((s) => `${s.name} — ${s.score}%`),
        improvements: improvements.map((s) => `${s.name} — ${s.score}%`),
        recommendation: band.recommendation,
      })
    } catch (err) {
      console.error('PDF generation error:', err)
      toast.error('Could not download test report PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-blue-light/40 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-3xl"
      >
        <h1 className="text-center text-3xl font-bold text-deep-blue">
          Your Lab Report is Ready!
        </h1>
        <p className="mt-2 text-center text-gray-500">
          Here&apos;s what we discovered about your English
        </p>

        {/* Score cards */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <Card key={section.name}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-deep-blue">
                  {section.icon} {section.name}
                </p>
                <p className="text-2xl font-bold text-electric-blue">
                  {section.score}%
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-light">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${section.score}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-full rounded-full bg-electric-blue"
                />
              </div>
            </Card>
          ))}
          <Card>
            <p className="font-semibold text-deep-blue">🎙️ Speaking</p>
            <p className="mt-2 text-sm text-gray-500">
              ⏳ Pending admin review — result will be emailed to you
            </p>
          </Card>
        </div>

        {/* Level banner */}
        <div className="mt-6 rounded-lab bg-deep-blue p-6 text-center">
          <p className="text-sm text-gray-300">
            Your combined score: {combined}%
          </p>
          <p className="mt-1 text-2xl font-bold text-lab-white">
            Your starting point:{' '}
            <span className="text-electric-blue">{band.label}</span>
          </p>
        </div>

        {/* Strengths / improvements */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <h2 className="font-bold text-deep-blue">💪 Strengths</h2>
            {strengths.length ? (
              <ul className="mt-3 flex flex-col gap-2">
                {strengths.map((s) => (
                  <li key={s.name} className="text-sm text-gray-600">
                    ✅ {s.name} — {s.score}%
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                Every scientist starts somewhere — your strengths are coming!
              </p>
            )}
          </Card>
          <Card>
            <h2 className="font-bold text-deep-blue">🌱 Areas to Improve</h2>
            {improvements.length ? (
              <ul className="mt-3 flex flex-col gap-2">
                {improvements.map((s) => (
                  <li key={s.name} className="text-sm text-gray-600">
                    🔬 {s.name} — {s.score}%
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                Nothing major — great work across the board!
              </p>
            )}
          </Card>
        </div>

        {/* Recommendation */}
        <Card className="mt-6">
          <h2 className="font-bold text-deep-blue">
            🧭 Recommended Starting Point
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {band.recommendation}
          </p>
        </Card>

        {/* Actions */}
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Button
            variant="secondary"
            size="lg"
            onClick={downloadPdf}
            loading={downloading}
          >
            Download My Lab Report
          </Button>
          <Link href="/available-labs" className="block">
            <Button size="lg" className="w-full">
              Enroll to the English Lab →
            </Button>
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Once your speaking is reviewed you will receive your full results by
          email along with a personal invitation to join a Lab session.
        </p>
      </motion.div>
    </div>
  )
}
