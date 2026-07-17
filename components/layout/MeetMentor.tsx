import { Suspense } from 'react'
import Image from 'next/image'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Badge from '@/components/ui/Badge'
import type { MentorProfile } from '@/types'

// Shown until the admin fills in their profile from the admin panel
const fallbackProfile: MentorProfile = {
  firstName: 'Your',
  lastName: 'Mentor',
  introduction:
    'Hi! I’m the scientist behind Language Labs. I’ve helped hundreds of students go from "too scared to speak" to chatting confidently in English.',
  qualifications: ['TESOL Certified', 'BA in English', '10+ Years Teaching'],
  teachingStyle:
    'My sessions feel more like experiments than lectures — we try things out loud, laugh at the misfires, and repeat what works until it sticks.',
  whyCreated:
    'I created Language Labs because I watched too many bright students stay silent in big classrooms. With just six seats, nobody gets left behind.',
}

async function getMentorProfile(): Promise<MentorProfile> {
  try {
    const snap = await getDoc(doc(db, 'admins', 'profile'))
    if (snap.exists()) return snap.data() as MentorProfile
  } catch {
    // Fall through to the placeholder profile
  }
  return fallbackProfile
}

async function MentorContent() {
  const mentor = await getMentorProfile()

  return (
    <div className="mt-12 grid items-start gap-10 md:grid-cols-[280px_1fr]">
      {/* Photo, name and qualifications */}
      <div className="flex flex-col items-center text-center">
        <div className="relative h-44 w-44 overflow-hidden rounded-full border-4 border-blue-light bg-blue-light">
          {mentor.photoUrl ? (
            <Image
              src={mentor.photoUrl}
              alt={`${mentor.firstName} ${mentor.lastName}`}
              fill
              sizes="176px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-6xl">
              👩‍🔬
            </span>
          )}
        </div>
        <h3 className="mt-4 text-xl font-bold text-deep-blue">
          {mentor.firstName} {mentor.lastName}
        </h3>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {mentor.qualifications.map((qualification) => (
            <Badge key={qualification} variant="info">
              {qualification}
            </Badge>
          ))}
        </div>
      </div>

      {/* Story */}
      <div className="flex flex-col gap-6">
        <p className="text-gray-600">{mentor.introduction}</p>

        <div className="rounded-lab border-l-4 border-deep-blue bg-blue-light/50 p-5">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-deep-blue">
            How I Teach
          </h4>
          <p className="mt-2 text-gray-600">{mentor.teachingStyle}</p>
        </div>

        <div className="rounded-lab border-l-4 border-electric-blue bg-blue-light/50 p-5">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-deep-blue">
            Why Language Labs Was Created
          </h4>
          <p className="mt-2 text-gray-600">{mentor.whyCreated}</p>
        </div>
      </div>
    </div>
  )
}

function MentorSkeleton() {
  return (
    <div className="mt-12 grid animate-pulse items-start gap-10 md:grid-cols-[280px_1fr]">
      <div className="flex flex-col items-center">
        <div className="h-44 w-44 rounded-full bg-blue-light" />
        <div className="mt-4 h-6 w-40 rounded bg-blue-light" />
        <div className="mt-3 flex gap-2">
          <div className="h-5 w-20 rounded-full bg-blue-light" />
          <div className="h-5 w-24 rounded-full bg-blue-light" />
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="h-20 rounded-lab bg-blue-light" />
        <div className="h-28 rounded-lab bg-blue-light" />
        <div className="h-28 rounded-lab bg-blue-light" />
      </div>
    </div>
  )
}

export default function MeetMentor() {
  return (
    <section className="bg-lab-white">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-deep-blue sm:text-4xl">
          Meet Your Mentor
        </h2>
        <Suspense fallback={<MentorSkeleton />}>
          <MentorContent />
        </Suspense>
      </div>
    </section>
  )
}
