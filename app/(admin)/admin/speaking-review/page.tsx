'use client'

import { useEffect, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import {
  getDocument,
  queryCollection,
  updateDocument,
} from '@/lib/firestore'
import { deleteFile } from '@/lib/storage'
import { formatDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { CardGridSkeleton } from '@/components/ui/Skeleton'
import { toast } from '@/hooks/useToast'
import type { TestResult, User } from '@/types'

interface ReviewItem {
  result: TestResult
  student: User | null
}

function levelFor(combined: number): string {
  if (combined <= 40) return 'Beginner'
  if (combined <= 60) return 'Elementary'
  if (combined <= 80) return 'Intermediate'
  return 'Upper Intermediate'
}

function resultsEmailHtml(
  name: string,
  scores: { reading: number; vocabulary: number; listening: number; speaking: number },
  overall: number,
  level: string,
  labsUrl: string
): string {
  const row = (label: string, value: number) =>
    `<tr>
      <td style="padding:6px 0;color:#6B7280;">${label}</td>
      <td style="padding:6px 0;text-align:right;font-weight:bold;color:#1E90FF;">${value}%</td>
    </tr>`
  return `
<div style="font-family:Arial,Helvetica,sans-serif;background:#E6F1FB;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;">
    <div style="background:#0A1628;padding:24px;text-align:center;">
      <span style="font-size:20px;font-weight:bold;color:#FFFFFF;">🧪 Language <span style="color:#1E90FF;">Labs</span></span>
    </div>
    <div style="padding:28px;color:#0A1628;font-size:15px;line-height:1.6;">
      <p>Hi ${name},</p>
      <p>🎉 Your speaking test has been reviewed — here is your complete lab report:</p>
      <table width="100%" style="background:#E6F1FB;border-radius:12px;padding:12px;border-collapse:separate;border-spacing:12px 0;">
        ${row('📖 Reading', scores.reading)}
        ${row('📚 Vocabulary', scores.vocabulary)}
        ${row('🎧 Listening', scores.listening)}
        ${row('🎙️ Speaking', scores.speaking)}
        <tr>
          <td style="padding:10px 0 6px;font-weight:bold;border-top:1px solid #FFFFFF;">Overall</td>
          <td style="padding:10px 0 6px;text-align:right;font-weight:bold;border-top:1px solid #FFFFFF;color:#0A1628;">${overall}%</td>
        </tr>
      </table>
      <p style="text-align:center;font-size:17px;margin:20px 0;">Your level: <strong style="color:#1E90FF;">${level}</strong></p>
      <p>You've taken the first step — now come practise with us! Labs have
      just 6 seats each, so everyone speaks in every session. We'd love to
      have you in the ${level} Lab.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${labsUrl}" style="background:#1E90FF;color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:bold;">Join a Lab</a>
      </p>
      <p>See you in the lab! 🔬</p>
    </div>
  </div>
</div>`
}

export default function SpeakingReviewPage() {
  const [items, setItems] = useState<ReviewItem[] | null>(null)
  const [scores, setScores] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    queryCollection<TestResult>('testResults', 'reviewedByAdmin', '==', false)
      .then(async (results) => {
        const withRecording = results
          .filter((r) => r.speakingFileUrl)
          .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())
        const students = await Promise.all(
          withRecording.map((r) => getDocument<User>('users', r.studentId))
        )
        setItems(
          withRecording.map((result, i) => ({ result, student: students[i] }))
        )
      })
      .catch(() => setItems([]))
  }, [])

  async function submitReview(item: ReviewItem) {
    const { result, student } = item
    const raw = scores[result.id]
    const score = Number(raw)
    if (!raw || Number.isNaN(score) || score < 1 || score > 10) {
      setErrors((e) => ({ ...e, [result.id]: 'Enter a score from 1 to 10' }))
      return
    }
    setErrors((e) => ({ ...e, [result.id]: '' }))
    setBusyId(result.id)

    try {
      // Stored as a percentage so it averages with the other sections
      const speakingPct = score * 10
      const overall = Math.round(
        (result.readingScore +
          result.vocabularyScore +
          result.listeningScore +
          speakingPct) /
          4
      )
      const level = levelFor(overall)

      await updateDocument<TestResult>('testResults', result.id, {
        speakingScore: speakingPct,
        reviewedByAdmin: true,
        reviewedAt: Timestamp.now(),
        level: level as TestResult['level'],
      })

      // Email the full results — non-critical if it fails
      if (student?.email) {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: student.email,
            subject: 'Your Complete Language Labs Test Results Are Ready! 🎉',
            html: resultsEmailHtml(
              student.firstName ?? student.fullName,
              {
                reading: result.readingScore,
                vocabulary: result.vocabularyScore,
                listening: result.listeningScore,
                speaking: speakingPct,
              },
              overall,
              level,
              `${window.location.origin}/available-labs`
            ),
          }),
        }).catch(() => {})
      }

      // Business rule: recording is deleted once marked and emailed
      if (result.speakingFileUrl) {
        try {
          await deleteFile(result.speakingFileUrl)
        } catch {
          // Already gone or URL-based deletion failed — not blocking
        }
      }

      setItems((current) =>
        current?.filter((i) => i.result.id !== result.id) ?? null
      )
      toast.success('Review submitted — full results emailed to the student.')
    } catch {
      setErrors((e) => ({
        ...e,
        [result.id]: 'Could not save the review. Please try again.',
      }))
    } finally {
      setBusyId(null)
    }
  }

  if (!items) {
    return (
      <div className="px-4 py-8 sm:px-8">
        <CardGridSkeleton
          count={2}
          cardClassName="h-72"
          gridClassName="grid-cols-1 xl:grid-cols-2"
        />
      </div>
    )
  }

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-deep-blue">
        Review Speaking Tests 🎙️
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {items.length === 0
          ? 'All caught up!'
          : `${items.length} student${items.length === 1 ? '' : 's'} waiting for speaking review`}
      </p>

      {items.length === 0 ? (
        <Card className="mt-10 max-w-md text-center">
          <p className="text-4xl">🏖️</p>
          <p className="mt-3 font-semibold text-deep-blue">
            No recordings to review
          </p>
          <p className="mt-1 text-sm text-gray-500">
            New submissions will appear here the moment students finish their
            level test.
          </p>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {items.map((item) => {
            const { result, student } = item
            return (
              <Card key={result.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-deep-blue">
                      {student?.fullName ?? 'Unknown student'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {student?.email ?? '—'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    Tested {formatDate(result.createdAt.toDate())}
                  </p>
                </div>

                {/* MCQ scores */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ['📖 Reading', result.readingScore],
                    ['📚 Vocabulary', result.vocabularyScore],
                    ['🎧 Listening', result.listeningScore],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lab bg-blue-light/60 p-2">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="font-bold text-electric-blue">{value}%</p>
                    </div>
                  ))}
                </div>

                {/* Recording */}
                <p className="mt-4 text-sm font-medium text-deep-blue">
                  Speaking recording:
                </p>
                <audio
                  controls
                  src={result.speakingFileUrl ?? undefined}
                  className="mt-2 w-full"
                />

                {/* Score + submit */}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Input
                      label="Speaking Score (out of 10)"
                      name={`score-${result.id}`}
                      type="number"
                      min={1}
                      max={10}
                      placeholder="1–10"
                      value={scores[result.id] ?? ''}
                      onChange={(e) =>
                        setScores((s) => ({
                          ...s,
                          [result.id]: e.target.value,
                        }))
                      }
                      error={errors[result.id] || undefined}
                    />
                  </div>
                  <Button
                    loading={busyId === result.id}
                    onClick={() => submitReview(item)}
                    disabled={busyId !== null && busyId !== result.id}
                  >
                    Submit Review
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
