import Hero from '@/components/layout/Hero'
import CourseOverview from '@/components/layout/CourseOverview'
import WhySixSeats from '@/components/layout/WhySixSeats'
import MeetMentor from '@/components/layout/MeetMentor'
import InsideLab from '@/components/layout/InsideLab'
import FreeResources from '@/components/layout/FreeResources'

// Refresh server-fetched content (mentor profile, resources) at most every hour
export const revalidate = 3600

export default function HomePage() {
  return (
    <>
      <Hero />
      <CourseOverview />
      <WhySixSeats />
      <MeetMentor />
      <InsideLab />
      <FreeResources />
    </>
  )
}
