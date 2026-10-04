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
import { toast } from '@/hooks/useToast'
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

  const totalSessions = lab?.totalSessions || TOTAL_SESSIONS
  const effectiveSessions = Math.max(
    presentCount,
    (lab?.weekCompleted ?? 0) * 2,
    lab?.status === 'completed' ? totalSessions : 0
  )
  const isComplete =
    !!lab && (
      lab.status === 'completed' ||
      presentCount >= totalSessions ||
      (lab.weekCompleted ?? 0) >= Math.ceil(totalSessions / 2) ||
      effectiveSessions >= totalSessions
    )

  /** Render the certificate div to a landscape A4 jsPDF document */
  async function buildPdf(): Promise<jsPDF | null> {
    const element = certRef.current
    if (!element) return null

    // Ensure all images (logo, signature) inside certificate element are fully loaded
    const images = Array.from(element.querySelectorAll('img'))
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalHeight !== 0) {
              resolve()
            } else {
              img.onload = () => resolve()
              img.onerror = () => resolve()
            }
          })
      )
    )

    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
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
      if (!pdf) throw new Error('Could not generate PDF')
      pdf.save('LANGUAGE-LABS-Certificate.pdf')
      toast.success('Certificate downloaded successfully! 🎓')
    } catch {
      toast.error('Could not download certificate PDF. Please try again.')
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
            subject: 'Your LANGUAGE LABS Certificate 🎓',
            html: `
<div style="font-family:Arial,Helvetica,sans-serif;color:#0A1628;padding:24px;">
  <p>Hi ${user!.firstName},</p>
  <p>🎉 Congratulations on completing all 16 sessions! Your Certificate of
  Completion is attached to this email.</p>
  <p>We're so proud of the scientist you've become. Keep experimenting!</p>
  <p>— The LANGUAGE LABS team</p>
</div>`,
            attachments: [
              {
                filename: 'LANGUAGE-LABS-Certificate.pdf',
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
            You have completed {effectiveSessions} of {totalSessions} sessions
          </h2>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-blue-light">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min((effectiveSessions / totalSessions) * 100, 100)}%`,
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
            Certificate unlocks when you complete all {totalSessions} sessions
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
          <div className="flex h-full flex-col items-center justify-between border-2 border-[#1E90FF] px-2.5 py-2.5 sm:px-8 sm:py-5">
            {/* Top Brand Header */}
            <div className="flex flex-col items-center">
              <div className="relative mb-1 flex h-8 w-8 items-center justify-center sm:mb-2 sm:h-12 sm:w-12">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/Logo1_no_bg.png"
                  alt="LANGUAGE LABS Logo"
                  crossOrigin="anonymous"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <p className="text-sm font-extrabold tracking-wider text-[#0A1628] sm:text-2xl">
                LANGUAGE <span className="text-[#1E90FF]">LABS</span>
              </p>
              <h2 className="mt-0.5 text-xs font-bold uppercase tracking-widest text-[#0A1628] sm:mt-2 sm:text-2xl">
                Certificate of Completion
              </h2>
            </div>

            {/* Recipient Details */}
            <div className="my-auto py-1">
              <p className="text-[10px] text-[#5A6472] sm:text-sm">
                This is to certify that
              </p>
              <p className="my-0.5 text-lg font-bold text-[#1E90FF] sm:my-1.5 sm:text-3xl">
                {user.fullName}
              </p>
              <p className="mx-auto max-w-md text-[9px] leading-relaxed text-[#5A6472] sm:text-xs">
                has successfully completed the comprehensive LANGUAGE LABS English Course
                comprising 16 sessions across the full curriculum
              </p>
            </div>

            {/* Bottom Footer: Date (Left) & Admin Signature + Mentor Name (Right) */}
            <div className="flex w-full items-end justify-between pt-1">
              <div className="flex flex-col items-start pb-1 text-left">
                <p className="text-[9px] text-[#5A6472] sm:text-xs">
                  Date of completion
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-[#0A1628] sm:mt-1 sm:text-sm">
                  {formatDate(lab ? completionDate(lab) : new Date())}
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                {/* Admin Signature positioned directly above admin name */}
                <div className="relative mb-0.5 flex h-8 w-24 items-center justify-center sm:h-12 sm:w-36">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/Subject.png"
                    alt="Admin Signature"
                    crossOrigin="anonymous"
                    className="max-h-full max-w-full object-contain object-bottom"
                  />
                </div>
                <p className="min-w-[110px] border-t border-[#0A1628] px-2 pt-1 text-[11px] font-semibold text-[#0A1628] sm:min-w-[150px] sm:px-6 sm:text-sm">
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
