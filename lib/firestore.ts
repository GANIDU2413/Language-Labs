import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  type DocumentData,
  type WhereFilterOp,
} from 'firebase/firestore'
import { db } from './firebase'

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
