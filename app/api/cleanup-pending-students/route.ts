import { NextResponse } from 'next/server'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  Timestamp,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Booking, User } from '@/types'

const RETENTION_DAYS = 7

/**
 * Hard-delete students who registered but never enrolled within 7 days
 * (business rule). Called by a cron job, or from the admin panel's
 * "Run Cleanup" button.
 *
 * TODO(firebase-admin): this route uses the client SDK, which (a) cannot
 * delete Firebase Auth accounts — only their Firestore data — and (b) will
 * be blocked by the security rules once deployed. Migrating this route to
 * the Admin SDK with a service-account key fixes both. Until then, the
 * admin panel button performs the same cleanup client-side as the
 * authenticated admin.
 */
export async function POST() {
  try {
    const cutoff = Timestamp.fromDate(
      new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
    )

    const pendingSnap = await getDocs(
      query(collection(db, 'users'), where('status', '==', 'pending'))
    )
    const stale = pendingSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as User & { id: string })
      .filter((u) => u.createdAt.toMillis() <= cutoff.toMillis())

    let deletedUsers = 0
    let deletedBookings = 0

    for (const user of stale) {
      const bookingsSnap = await getDocs(
        query(collection(db, 'bookings'), where('studentId', '==', user.id))
      )
      for (const booking of bookingsSnap.docs) {
        await deleteDoc(doc(db, 'bookings', booking.id))
        deletedBookings++
      }
      await deleteDoc(doc(db, 'users', user.id))
      deletedUsers++
    }

    return NextResponse.json({
      success: true,
      deletedUsers,
      deletedBookings,
      note: 'Firebase Auth accounts require the Admin SDK and were not deleted.',
    })
  } catch (err) {
    console.error('cleanup-pending-students failed:', err)
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    )
  }
}
