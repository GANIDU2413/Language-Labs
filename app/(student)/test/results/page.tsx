'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { queryCollection } from '@/lib/firestore'
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

export default function TestResultsPage() {
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading } = useAuth()
  const [result, setResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!firebaseUser) {
      router.push('/login')
      return
    }
    queryCollection<TestResult>(
      'testResults',
      'studentId',
      '==',
      firebaseUser.uid
    )
      .then((results) => {
        // Latest attempt first
        results.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
        setResult(results[0] ?? null)
      })
      .catch(() => setResult(null))
      .finally(() => setLoading(false))
  }, [authLoading, firebaseUser, router])

  if (authLoading || loading) return <LoadingSpinner size="lg" fullPage />

  if (!result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-center text-gray-600">
          We couldn&apos;t find a test result for you yet.
        </p>
        <Link href="/test">
          <Button>Take the Level Test</Button>
        </Link>
      </div>
    )
  }

  const sections = [
    { name: 'Reading', icon: '📖', score: result.readingScore },
    { name: 'Vocabulary', icon: '📚', score: result.vocabularyScore },
    { name: 'Listening', icon: '🎧', score: result.listeningScore },
  ]
  const combined = Math.round(
    (result.readingScore + result.vocabularyScore + result.listeningScore) / 3
  )
  const band = getLevelBand(combined)
  const strengths = sections.filter((s) => s.score >= 70)
  const improvements = sections.filter((s) => s.score < 70)
  const [downloading, setDownloading] = useState(false)

  async function downloadPdf() {
    if (!result) return
    setDownloading(true)
    try {
      await generateTestReportPdf({
        studentName: user?.fullName ?? 'LANGUAGE LABS Student',
        date: formatDate(result.createdAt.toDate()),
        readingScore: result.readingScore,
        vocabularyScore: result.vocabularyScore,
        listeningScore: result.listeningScore,
        levelLabel: band.label,
        strengths: strengths.map((s) => `${s.name} — ${s.score}%`),
        improvements: improvements.map((s) => `${s.name} — ${s.score}%`),
        recommendation: band.recommendation,
      })
    } catch {
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
