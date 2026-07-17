import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  uploadBytesResumable,
} from 'firebase/storage'
import { storage } from './firebase'

/**
 * Upload a file to Firebase Storage at the given path.
 * Returns the file's download URL.
 * Example: uploadFile(recording, `speaking/${studentId}.webm`)
 */
export async function uploadFile(file: File, path: string): Promise<string> {
  const fileRef = ref(storage, path)
  await uploadBytes(fileRef, file)
  return getDownloadURL(fileRef)
}

/**
 * Upload with progress reporting (0–100). Returns the download URL.
 * Example: uploadFileWithProgress(pdf, `resources/pdfs/${name}`, setPct)
 */
export function uploadFileWithProgress(
  file: File,
  path: string,
  onProgress: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), file)
    task.on(
      'state_changed',
      (snap) =>
        onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      () => getDownloadURL(task.snapshot.ref).then(resolve, reject)
    )
  })
}

/** Delete a file from Firebase Storage */
export async function deleteFile(path: string): Promise<void> {
  await deleteObject(ref(storage, path))
}

/** Get the download URL of an existing file */
export async function getFileURL(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path))
}
