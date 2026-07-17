'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { uploadFile } from '@/lib/storage'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface SpeakingSectionProps {
  userId: string
  /** The speaking topic/question text */
  question: string
  /** Whether mic permission was granted on the rules screen */
  micGranted: boolean
  /** Called with the uploaded recording URL, or null when skipped */
  onComplete: (speakingFileUrl: string | null) => void
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading'

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default function SpeakingSection({
  userId,
  question,
  micGranted,
  onComplete,
}: SpeakingSectionProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup: stop the timer and release the playback URL
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : undefined // let the browser pick (e.g. audio/mp4 on Safari)
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      )
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        blobRef.current = blob
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((track) => track.stop())
        setState('recorded')
      }

      recorder.start()
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      setState('recording')
    } catch {
      setError(
        'Could not start recording. Please check your microphone and try again.'
      )
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    recorderRef.current?.stop()
  }

  function reRecord() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    blobRef.current = null
    setSeconds(0)
    setState('idle')
  }

  async function submit() {
    const blob = blobRef.current
    if (!blob) return
    setState('uploading')
    setError('')
    try {
      const extension = blob.type.includes('mp4') ? 'mp4' : 'webm'
      const file = new File([blob], `recording.${extension}`, {
        type: blob.type,
      })
      const url = await uploadFile(
        file,
        `speaking-recordings/${userId}/${Date.now()}.${extension}`
      )
      onComplete(url)
    } catch {
      setError('Upload failed. Please check your connection and try again.')
      setState('recorded')
    }
  }

  // Mic was denied on the rules screen
  if (!micGranted) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-deep-blue">
          Speaking Section 🎙️
        </h1>
        <Card className="mt-6 text-center">
          <p className="text-4xl">🤐</p>
          <p className="mx-auto mt-4 max-w-md text-gray-600">
            Speaking section is not available without microphone access. Your
            other scores will still be submitted.
          </p>
          <Button size="lg" onClick={() => onComplete(null)} className="mt-6">
            Skip and Submit Test
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-deep-blue">Speaking Section 🎙️</h1>

      {/* Topic */}
      <Card className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-electric-blue">
          Your topic
        </p>
        <p className="mt-2 text-lg leading-relaxed text-deep-blue">{question}</p>
      </Card>

      {/* Recording area */}
      <Card className="mt-6 flex flex-col items-center py-10 text-center">
        {state === 'idle' && (
          <>
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-light text-5xl">
              🎙️
            </span>
            <Button size="lg" onClick={startRecording} className="mt-6">
              Press to Start Recording
            </Button>
            <p className="mt-3 text-sm text-gray-400">
              Take a breath — you&apos;ve got this!
            </p>
          </>
        )}

        {state === 'recording' && (
          <>
            <div className="relative flex h-24 w-24 items-center justify-center">
              {/* Red pulse */}
              <motion.span
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.1, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-seat-reserved"
              />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-seat-reserved text-4xl">
                🎙️
              </span>
            </div>
            <p
              className="mt-4 font-mono text-2xl font-bold text-deep-blue"
              aria-live="polite"
            >
              {formatTime(seconds)}
            </p>
            <Button
              size="lg"
              variant="danger"
              onClick={stopRecording}
              className="mt-4"
            >
              Stop Recording
            </Button>
          </>
        )}

        {(state === 'recorded' || state === 'uploading') && audioUrl && (
          <>
            <p className="font-semibold text-deep-blue">
              🎉 Great job! Listen to yourself:
            </p>
            <audio controls src={audioUrl} className="mt-4 w-full max-w-sm" />
            <p className="mt-2 text-sm text-gray-400">
              Recording length: {formatTime(seconds)}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="secondary"
                onClick={reRecord}
                disabled={state === 'uploading'}
              >
                Re-record
              </Button>
              <Button loading={state === 'uploading'} onClick={submit}>
                Submit Recording
              </Button>
            </div>
          </>
        )}

        {error && (
          <p className="mt-4 rounded-lab bg-red-50 px-4 py-3 text-sm text-seat-reserved">
            {error}
          </p>
        )}
      </Card>
    </div>
  )
}
