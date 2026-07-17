import { redirect } from 'next/navigation'

export default function UpcomingLabsPage() {
  redirect('/admin/labs/not-started')
}
