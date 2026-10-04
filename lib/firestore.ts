import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type WhereFilterOp,
  type WriteBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { deleteFile } from './storage'
import type {
  AttendanceRecord,
  Booking,
  InClassResult,
  Lab,
  TestResult,
  WaitingListEntry,
} from '@/types'

/** All Firestore collection names used by the app */
export type CollectionName =
  | 'users'
  | 'labs'
  | 'bookings'
  | 'waitingList'
  | 'testQuestions'
  | 'testResults'
  | 'resources'
  | 'inClassTests'
  | 'inClassResults'
  | 'attendance'
  | 'otpCodes'
  | 'suggestions'

/**
 * Add a new document with an auto-generated id.
 * Returns the new document's id.
 */
export async function addDocument<T extends DocumentData>(
  collectionName: CollectionName,
  data: Omit<T, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, collectionName), data as DocumentData)
  return ref.id
}

/**
 * Get a single document by id.
 * Returns null when the document does not exist.
 */
export async function getDocument<T extends DocumentData>(
  collectionName: CollectionName,
  id: string
): Promise<T | null> {
  const snap = await getDoc(doc(db, collectionName, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as unknown as T
}

/** Update fields on an existing document */
export async function updateDocument<T extends DocumentData>(
  collectionName: CollectionName,
  id: string,
  data: Partial<Omit<T, 'id'>>
): Promise<void> {
  await updateDoc(doc(db, collectionName, id), data as DocumentData)
}

/** Delete a document by id */
export async function deleteDocument(
  collectionName: CollectionName,
  id: string
): Promise<void> {
  await deleteDoc(doc(db, collectionName, id))
}

/** Get every document in a collection */
export async function getCollection<T extends DocumentData>(
  collectionName: CollectionName
): Promise<T[]> {
  const snap = await getDocs(collection(db, collectionName))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as T)
}

/**
 * Query a collection with a single where clause.
 * Example: queryCollection<Booking>('bookings', 'labId', '==', labId)
 */
export async function queryCollection<T extends DocumentData>(
  collectionName: CollectionName,
  field: string,
  operator: WhereFilterOp,
  value: unknown
): Promise<T[]> {
  const q = query(collection(db, collectionName), where(field, operator, value))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as T)
}

/**
 * Find any waiting list entries matching a student's email or studentId.
 */
export async function findWaitingListEntriesForStudent(
  email: string,
  studentId?: string
): Promise<WaitingListEntry[]> {
  const cleanEmail = email.trim().toLowerCase()
  const queries: Promise<WaitingListEntry[]>[] = [
    queryCollection<WaitingListEntry>('waitingList', 'email', '==', cleanEmail),
  ]
  if (studentId) {
    queries.push(
      queryCollection<WaitingListEntry>('waitingList', 'studentId', '==', studentId)
    )
  }

  const results = await Promise.all(queries)
  const uniqueEntries = new Map<string, WaitingListEntry>()
  for (const list of results) {
    for (const entry of list) {
      if (entry.id) {
        uniqueEntries.set(entry.id, entry)
      }
    }
  }
  return Array.from(uniqueEntries.values())
}

/**
 * Remove a user from the waitingList collection if they exist,
 * by matching either their email (case-insensitive) or their studentId.
 * If a WriteBatch is supplied, delete operations are queued in the batch.
 * Returns the IDs of the deleted waiting list documents.
 */
export async function removeStudentFromWaitingList(
  email: string,
  studentId?: string,
  batch?: WriteBatch
): Promise<string[]> {
  const entries = await findWaitingListEntriesForStudent(email, studentId)
  const deletedIds: string[] = []

  for (const entry of entries) {
    if (batch) {
      batch.delete(doc(db, 'waitingList', entry.id))
      deletedIds.push(entry.id)
    } else {
      try {
        await deleteDoc(doc(db, 'waitingList', entry.id))
        deletedIds.push(entry.id)
      } catch (err) {
        console.error(`Failed to remove waiting list entry ${entry.id}:`, err)
      }
    }
  }

  return deletedIds
}

/**
 * Toggle a student's disabled status in Firestore and Firebase Auth.
 */
export async function setStudentDisabled(
  studentId: string,
  disabled: boolean
): Promise<void> {
  await updateDoc(doc(db, 'users', studentId), {
    disabled,
    ...(disabled ? { disabledAt: Timestamp.now() } : { disabledAt: null }),
  })

  // Synchronize with backend Firebase Auth
  try {
    await fetch(`/api/admin/students/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabled }),
    })
  } catch (err) {
    console.warn('Failed to sync disabled state with backend auth:', err)
  }
}

/**
 * Completely purge a student's data across the entire system:
 * - Firebase Auth user account (via backend endpoint)
 * - Users profile document
 * - Bookings and payment records
 * - Lab seat reservations (releases seat to 'available')
 * - Waiting list entries
 * - Level test results and speaking audio files
 * - In-class test submissions/scores
 * - Attendance records
 * - Server OTP records
 */
export async function purgeStudentData(
  studentId: string,
  studentEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = studentEmail.trim().toLowerCase()

    // 1. Backend Auth and OTP code cleanup
    try {
      await fetch(`/api/admin/students/${studentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      })
    } catch (err) {
      console.warn('Backend auth deletion API call failed (continuing Firestore purge):', err)
    }

    // 2. Bookings cleanup (matching studentId or email)
    const [bookingsById, bookingsByEmail] = await Promise.all([
      queryCollection<Booking>('bookings', 'studentId', '==', studentId),
      queryCollection<Booking>('bookings', 'studentEmail', '==', cleanEmail),
    ])
    const allBookings = new Map<string, Booking>()
    for (const b of [...bookingsById, ...bookingsByEmail]) {
      if (b.id) allBookings.set(b.id, b)
    }
    for (const booking of allBookings.values()) {
      try {
        await deleteDoc(doc(db, 'bookings', booking.id))
      } catch (err) {
        console.warn(`Failed to delete booking ${booking.id}:`, err)
      }
    }

    // 3. Lab seats cleanup — release any desks claimed or confirmed by this student
    const allLabs = await getCollection<Lab>('labs')
    for (const lab of allLabs) {
      const hasSeat = lab.seats?.some((s) => s.studentId === studentId)
      if (hasSeat) {
        const updatedSeats = (lab.seats ?? []).map((seat) => {
          if (seat.studentId === studentId) {
            return {
              seatNumber: seat.seatNumber,
              status: 'available' as const,
            }
          }
          return seat
        })
        try {
          await updateDoc(doc(db, 'labs', lab.id), { seats: updatedSeats })
        } catch (err) {
          console.warn(`Failed to release seat in lab ${lab.id}:`, err)
        }
      }
    }

    // 4. Waiting list cleanup
    await removeStudentFromWaitingList(cleanEmail, studentId)

    // 5. Test results cleanup (and speaking audio file)
    const testResults = await queryCollection<TestResult>(
      'testResults',
      'studentId',
      '==',
      studentId
    )
    for (const result of testResults) {
      if (result.speakingFileUrl) {
        try {
          await deleteFile(result.speakingFileUrl)
        } catch {
          // File may already be deleted or not found in storage
        }
      }
      try {
        await deleteDoc(doc(db, 'testResults', result.id))
      } catch (err) {
        console.warn(`Failed to delete testResult ${result.id}:`, err)
      }
    }

    // 6. In-class quiz results cleanup
    const inClassResults = await queryCollection<InClassResult>(
      'inClassResults',
      'studentId',
      '==',
      studentId
    )
    for (const quizResult of inClassResults) {
      try {
        await deleteDoc(doc(db, 'inClassResults', quizResult.id))
      } catch (err) {
        console.warn(`Failed to delete inClassResult ${quizResult.id}:`, err)
      }
    }

    // 7. Attendance records cleanup
    const attendanceRecords = await queryCollection<AttendanceRecord>(
      'attendance',
      'studentId',
      '==',
      studentId
    )
    for (const record of attendanceRecords) {
      try {
        await deleteDoc(doc(db, 'attendance', record.id))
      } catch (err) {
        console.warn(`Failed to delete attendance record ${record.id}:`, err)
      }
    }

    // 8. Delete user profile document
    await deleteDoc(doc(db, 'users', studentId))

    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to purge student data'
    console.error(`purgeStudentData error for ${studentId}:`, err)
    return { success: false, error: errorMsg }
  }
}
