'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { jsPDF } from 'jspdf'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getDocument, queryCollection, updateDocument } from '@/lib/firestore'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { AttendanceRecord, Lab, MentorProfile, User } from '@/types'

const TOTAL_SESSIONS = 16

/** Certificate completion date: the lab's final session */
function completionDate(lab: Lab): Date {
  const date = lab.startDate.toDate()
  date.setDate(date.getDate() + 7 * 7 + 3) // week 8, second session
  return date
}

export default function CertificatePage() {
  const { user, firebaseUser } = useAuth()
  const [lab, setLab] = useState<Lab | null>(null)
  const [presentCount, setPresentCount] = useState(0)
  const [mentorName, setMentorName] = useState('Lab Mentor')
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [emailNote, setEmailNote] = useState('')
  const certRef = useRef<HTMLDivElement | null>(null)
  const emailAttemptedRef = useRef(false)

  useEffect(() => {
    if (!user || !firebaseUser) return
    if (!user.enrolledLabId) {
      setLoading(false)
      return
    }
    Promise.all([
      getDocument<Lab>('labs', user.enrolledLabId),
      queryCollection<AttendanceRecord>(
        'attendance',
        'studentId',
        '==',
        firebaseUser.uid
      ),
      getDoc(doc(db, 'admins', 'profile')),
    ])
      .then(([labDoc, records, mentorSnap]) => {
        setLab(labDoc)
        setPresentCount(
          records.filter((r) => r.labId === user.enrolledLabId && r.present)
            .length
        )
        if (mentorSnap.exists()) {
          const mentor = mentorSnap.data() as MentorProfile
          setMentorName(`${mentor.firstName} ${mentor.lastName}`)
        }
      })
      .finally(() => setLoading(false))
  }, [user, firebaseUser])

  const isComplete =
    !!lab && (lab.status === 'completed' || presentCount >= TOTAL_SESSIONS)

  /** Render the certificate div to a landscape A4 jsPDF document */
  async function buildPdf(): Promise<jsPDF | null> {
    const element = certRef.current
    if (!element) return null
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
    })
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgHeight = (canvas.height * pageWidth) / canvas.width
    const y = Math.max(0, (pageHeight - imgHeight) / 2)
    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      0,
      y,
      pageWidth,
      Math.min(imgHeight, pageHeight)
    )
    return pdf
  }

  async function downloadPdf() {
    setDownloading(true)
    try {
      const pdf = await buildPdf()
      pdf?.save('language-labs-certificate.pdf')
    } finally {
      setDownloading(false)
    }
  }

  // Email the certificate automatically on first view (once, flagged on the user doc)
  useEffect(() => {
    if (
      !isComplete ||
      !user ||
      !firebaseUser ||
      user.certificateEmailSent ||
      emailAttemptedRef.current
    ) {
      return
    }
    emailAttemptedRef.current = true

    async function sendCertificate() {
      try {
        const pdf = await buildPdf()
        if (!pdf) return
        const base64 = pdf.output('datauristring').split(',')[1]
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user!.email,
            subject: 'Your Language Labs Certificate 🎓',
            html: `
<div style="font-family:Arial,Helvetica,sans-serif;color:#0A1628;padding:24px;">
  <p>Hi ${user!.firstName},</p>
  <p>🎉 Congratulations on completing all 16 sessions! Your Certificate of
  Completion is attached to this email.</p>
  <p>We're so proud of the scientist you've become. Keep experimenting!</p>
  <p>— The Language Labs team 🔬</p>
</div>`,
            attachments: [
              {
                filename: 'language-labs-certificate.pdf',
                content: base64,
              },
            ],
          }),
        })
        if (res.ok) {
          await updateDocument<User>('users', firebaseUser!.uid, {
            certificateEmailSent: true,
          })
          setEmailNote('📧 A copy of your certificate was emailed to you!')
        }
      } catch {
        // Silent — the student can always download it here
      }
    }
    // Give the certificate div a moment to fully render fonts/layout
    const timer = setTimeout(sendCertificate, 1500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, user, firebaseUser])

  if (loading || !user) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // ------------------------------------------------------- not complete yet
  if (!isComplete) {
    return (
      <div className="px-4 py-8 sm:px-8">
        <h1 className="text-2xl font-bold text-deep-blue">Certificate 🏅</h1>
        <Card className="mt-6 max-w-md text-center">
          <p className="text-4xl">🔬</p>
          <h2 className="mt-3 font-bold text-deep-blue">
            You have completed {presentCount} of {TOTAL_SESSIONS} sessions
          </h2>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-blue-light">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${(presentCount / TOTAL_SESSIONS) * 100}%`,
              }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-electric-blue"
            />
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Every session brings you closer to your certificate — and more
            importantly, to confident English. Keep showing up, scientist! 💪
          </p>
          <Button disabled className="mt-6">
            Certificate unlocks when you complete all {TOTAL_SESSIONS} sessions
          </Button>
        </Card>
      </div>
    )
  }

  // --------------------------------------------------------------- complete
  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-deep-blue">Certificate 🏅</h1>
      <p className="mt-1 text-sm text-gray-500">
        Congratulations — you completed the full experiment! 🎉
      </p>
      {emailNote && (
        <p className="mt-3 max-w-xl rounded-lab bg-green-50 px-4 py-3 text-sm text-green-700">
          {emailNote}
        </p>
      )}

      {/* Certificate preview — brand hex colours only (html2canvas-safe),
          responsive so it fits a 375px screen without horizontal scroll */}
      <div className="mt-6 max-w-3xl">
        <div
          ref={certRef}
          className="mx-auto aspect-[1.414/1] w-full border-4 border-[#0A1628] bg-white p-3 text-center sm:border-8 sm:p-10"
        >
          <div className="flex h-full flex-col items-center justify-between border-2 border-[#1E90FF] px-3 py-3 sm:px-8 sm:py-6">
            <div>
              <p className="text-base font-bold text-[#0A1628] sm:text-2xl">
                🧪 Language <span className="text-[#1E90FF]">Labs</span>
              </p>
              <h2 className="mt-1 text-sm font-bold uppercase tracking-widest text-[#0A1628] sm:mt-4 sm:text-3xl">
                Certificate of Completion
              </h2>
            </div>

            <div>
              <p className="text-xs text-[#5A6472] sm:text-sm">
                This is to certify that
              </p>
              <p className="mt-1 text-xl font-bold text-[#1E90FF] sm:mt-2 sm:text-4xl">
                {user.fullName}
              </p>
              <p className="mx-auto mt-1 max-w-md text-[10px] leading-relaxed text-[#5A6472] sm:mt-3 sm:text-sm">
                has successfully completed the Language Labs English Course
                comprising of 16 sessions over 8 weeks
              </p>
            </div>

            <div className="flex w-full items-end justify-between">
              <div className="text-left">
                <p className="text-[9px] text-[#5A6472] sm:text-xs">
                  Date of completion
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-[#0A1628] sm:mt-1 sm:text-sm">
                  {formatDate(lab ? completionDate(lab) : new Date())}
                </p>
              </div>
              <div className="text-right">
                <p className="border-t border-[#0A1628] px-2 pt-1 text-[11px] font-semibold text-[#0A1628] sm:px-6 sm:text-sm">
                  {mentorName}
                </p>
                <p className="mt-0.5 text-[9px] text-[#5A6472] sm:text-xs">
                  Lab Mentor
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Button
        size="lg"
        loading={downloading}
        onClick={downloadPdf}
        className="mt-6"
      >
        Download Certificate as PDF
      </Button>
    </div>
  )
}
