'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getCollection } from '@/lib/firestore'
import { uploadFileWithProgress } from '@/lib/storage'
import {
  FormActions,
  OptionInputs,
  ReadingForm,
  textareaClass,
  VocabularyForm,
} from '@/components/admin/QuestionForms'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { ListeningQuestion, TestQuestions } from '@/types'

type Section = 'reading' | 'vocabulary' | 'listening' | 'speaking'

const TARGETS: Record<Section, number> = {
  reading: 3,
  vocabulary: 3,
  listening: 3,
  speaking: 1,
}

type Bank = Omit<TestQuestions, 'id' | 'updatedAt'>

const emptyBank: Bank = {
  reading: [],
  vocabulary: [],
  listening: [],
  speaking: { id: 'speaking-1', question: '' },
}

// ---------------------------------------------------------------------------
// Listening form (files are specific to the level test, so it lives here)
// ---------------------------------------------------------------------------

const listeningSchema = z.object({
  question: z.string().min(3, 'Question is required'),
  options: z.array(z.string().min(1, 'Required')).length(4),
  correctIndex: z.coerce.number().min(0).max(3),
})
type ListeningFormData = z.output<typeof listeningSchema>

function ListeningForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial?: ListeningQuestion
  saving: boolean
  onSave: (q: Omit<ListeningQuestion, 'imageUrl' | 'audioUrl'>, image: File | null, audio: File | null) => void
  onCancel: () => void
}) {
  const [image, setImage] = useState<File | null>(null)
  const [audio, setAudio] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof listeningSchema>, unknown, ListeningFormData>({
    resolver: zodResolver(listeningSchema),
    defaultValues: initial
      ? {
          question: initial.question,
          options: initial.options,
          correctIndex: initial.correctIndex,
        }
      : { options: ['', '', '', ''], correctIndex: 0 },
  })

  function submit(data: ListeningFormData) {
    setFileError('')
    if (!initial && (!image || !audio)) {
      setFileError('Both an image and an audio clip are required')
      return
    }
    onSave(
      {
        id: initial?.id ?? crypto.randomUUID(),
        question: data.question.trim(),
        options: data.options.map((o) => o.trim()),
        correctIndex: data.correctIndex,
      },
      image,
      audio
    )
  }

  const fileClass =
    'rounded-lab border border-gray-300 bg-lab-white px-4 py-2 text-sm text-gray-600 file:mr-3 file:rounded-lab file:border-0 file:bg-electric-blue file:px-4 file:py-1.5 file:font-semibold file:text-lab-white'

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
      <Input
        label="Question"
        name="question"
        placeholder="What is happening in the picture?"
        required
        register={register('question')}
        error={errors.question?.message}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-deep-blue">
            Image {initial && <span className="font-normal text-gray-400">(optional — keeps current)</span>}
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            className={fileClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-deep-blue">
            Audio {initial && <span className="font-normal text-gray-400">(optional — keeps current)</span>}
          </label>
          <input
            type="file"
            accept=".mp3,.wav,.webm,audio/*"
            onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
            className={fileClass}
          />
        </div>
      </div>
      {fileError && <p className="text-sm text-seat-reserved">{fileError}</p>}
      <OptionInputs register={register} errors={errors} />
      <FormActions saving={saving} editing={!!initial} onCancel={onCancel} />
    </form>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TestMaterialsPage() {
  const [docId, setDocId] = useState('level-test')
  const [bank, setBank] = useState<Bank | null>(null)
  const [tab, setTab] = useState<Section>('reading')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadPct, setUploadPct] = useState<{ image?: number; audio?: number }>({})
  const [message, setMessage] = useState('')
  const [speakingText, setSpeakingText] = useState('')

  useEffect(() => {
    getCollection<TestQuestions>('testQuestions')
      .then((docs) => {
        const existing = docs[0]
        if (existing) {
          setDocId(existing.id)
          setBank({
            reading: existing.reading ?? [],
            vocabulary: existing.vocabulary ?? [],
            listening: existing.listening ?? [],
            speaking: existing.speaking ?? emptyBank.speaking,
          })
          setSpeakingText(existing.speaking?.question ?? '')
        } else {
          setBank(emptyBank)
        }
      })
      .catch(() => setBank(emptyBank))
  }, [])

  async function persist(update: Partial<Bank>): Promise<void> {
    await setDoc(
      doc(db, 'testQuestions', docId),
      { ...update, updatedAt: Timestamp.now() },
      { merge: true }
    )
    setBank((current) => (current ? { ...current, ...update } : current))
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
  }

  async function saveListItem<T extends { id: string }>(
    section: 'reading' | 'vocabulary' | 'listening',
    item: T
  ) {
    if (!bank) return
    const list = bank[section] as unknown as T[]
    const updated = editingId
      ? list.map((q) => (q.id === item.id ? item : q))
      : [...list, item]
    setSaving(true)
    setMessage('')
    try {
      await persist({ [section]: updated } as Partial<Bank>)
      setMessage('✅ Saved.')
      closeForm()
    } catch {
      setMessage('❌ Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteListItem(
    section: 'reading' | 'vocabulary' | 'listening',
    id: string
  ) {
    if (!bank) return
    const list = bank[section] as { id: string }[]
    try {
      await persist({ [section]: list.filter((q) => q.id !== id) } as Partial<Bank>)
    } catch {
      setMessage('❌ Delete failed. Please try again.')
    }
  }

  async function saveListening(
    q: Omit<ListeningQuestion, 'imageUrl' | 'audioUrl'>,
    image: File | null,
    audio: File | null
  ) {
    if (!bank) return
    setSaving(true)
    setMessage('')
    try {
      const existing = bank.listening.find((l) => l.id === q.id)
      let imageUrl = existing?.imageUrl ?? ''
      let audioUrl = existing?.audioUrl ?? ''
      if (image) {
        imageUrl = await uploadFileWithProgress(
          image,
          `test-materials/images/${Date.now()}-${image.name}`,
          (pct) => setUploadPct((p) => ({ ...p, image: pct }))
        )
      }
      if (audio) {
        audioUrl = await uploadFileWithProgress(
          audio,
          `test-materials/audio/${Date.now()}-${audio.name}`,
          (pct) => setUploadPct((p) => ({ ...p, audio: pct }))
        )
      }
      setUploadPct({})
      const item: ListeningQuestion = { ...q, imageUrl, audioUrl }
      const updated = editingId
        ? bank.listening.map((l) => (l.id === item.id ? item : l))
        : [...bank.listening, item]
      await persist({ listening: updated })
      setMessage('✅ Saved.')
      closeForm()
    } catch {
      setUploadPct({})
      setMessage('❌ Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function saveSpeaking() {
    if (!bank || speakingText.trim().length < 5) {
      setMessage('❌ The speaking topic is too short.')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      await persist({
        speaking: { id: bank.speaking.id, question: speakingText.trim() },
      })
      setMessage('✅ Speaking topic saved.')
      setFormOpen(false)
    } catch {
      setMessage('❌ Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!bank) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const counts: Record<Section, number> = {
    reading: bank.reading.length,
    vocabulary: bank.vocabulary.length,
    listening: bank.listening.length,
    speaking: bank.speaking.question ? 1 : 0,
  }

  const sections: Section[] = ['reading', 'vocabulary', 'listening', 'speaking']

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-deep-blue">Tests Materials 📝</h1>
      <p className="mt-1 text-sm text-gray-500">
        Manage the level test content — students see these in the 4-section test.
      </p>

      {/* Tabs with counts */}
      <div className="mt-6 flex flex-wrap gap-2">
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => {
              setTab(s)
              closeForm()
              setMessage('')
            }}
            className={`rounded-lab px-4 py-2 text-sm font-semibold capitalize transition-colors ${
              tab === s
                ? 'bg-electric-blue text-lab-white'
                : 'bg-lab-white text-gray-600 hover:bg-blue-light'
            }`}
          >
            {s} {counts[s]}/{TARGETS[s]}
          </button>
        ))}
      </div>

      {message && (
        <p className="mt-4 max-w-2xl rounded-lab bg-blue-light px-4 py-3 text-sm text-deep-blue">
          {message}
        </p>
      )}

      <div className="mt-6 max-w-2xl">
        {/* ------------------------------------------------ speaking tab */}
        {tab === 'speaking' ? (
          <Card>
            <h2 className="font-bold text-deep-blue">Speaking Topic 🎙️</h2>
            <p className="mt-1 text-sm text-gray-500">
              Only one speaking topic — students record a voice answer to it.
            </p>
            {bank.speaking.question && !formOpen ? (
              <>
                <p className="mt-4 rounded-lab bg-blue-light/60 p-4 text-deep-blue">
                  {bank.speaking.question}
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => setFormOpen(true)}
                >
                  Edit Topic
                </Button>
              </>
            ) : (
              <>
                <textarea
                  rows={3}
                  value={speakingText}
                  onChange={(e) => setSpeakingText(e.target.value)}
                  placeholder="Tell us about your favourite place and why you love it."
                  className={`mt-4 w-full ${textareaClass}`}
                />
                <div className="mt-4 flex gap-3">
                  <Button loading={saving} onClick={saveSpeaking}>
                    Save Topic
                  </Button>
                  {bank.speaking.question && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setFormOpen(false)
                        setSpeakingText(bank.speaking.question)
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </>
            )}
          </Card>
        ) : (
          <>
            {/* -------------------------------------- list-based tabs */}
            {!formOpen && (
              <Button onClick={() => setFormOpen(true)}>
                Add {tab === 'reading' ? 'Reading' : tab === 'vocabulary' ? 'Vocabulary' : 'Listening'} Question
              </Button>
            )}

            {formOpen && (
              <Card>
                {tab === 'reading' && (
                  <ReadingForm
                    initial={bank.reading.find((q) => q.id === editingId)}
                    saving={saving}
                    onSave={(q) => saveListItem('reading', q)}
                    onCancel={closeForm}
                  />
                )}
                {tab === 'vocabulary' && (
                  <VocabularyForm
                    initial={bank.vocabulary.find((q) => q.id === editingId)}
                    saving={saving}
                    onSave={(q) => saveListItem('vocabulary', q)}
                    onCancel={closeForm}
                  />
                )}
                {tab === 'listening' && (
                  <>
                    <ListeningForm
                      initial={bank.listening.find((q) => q.id === editingId)}
                      saving={saving}
                      onSave={saveListening}
                      onCancel={closeForm}
                    />
                    {(uploadPct.image !== undefined ||
                      uploadPct.audio !== undefined) && (
                      <p className="mt-3 text-sm text-gray-500">
                        {uploadPct.image !== undefined &&
                          `🖼️ Image ${uploadPct.image}% `}
                        {uploadPct.audio !== undefined &&
                          `🎵 Audio ${uploadPct.audio}%`}
                      </p>
                    )}
                  </>
                )}
              </Card>
            )}

            {/* Existing questions */}
            <div className="mt-6 flex flex-col gap-3">
              {tab === 'reading' &&
                bank.reading.map((q) => (
                  <QuestionRow
                    key={q.id}
                    title={q.questions[0]?.question ?? '(no question)'}
                    subtitle={q.paragraph.slice(0, 90) + (q.paragraph.length > 90 ? '…' : '')}
                    onEdit={() => {
                      setEditingId(q.id)
                      setFormOpen(true)
                    }}
                    onDelete={() => deleteListItem('reading', q.id)}
                  />
                ))}
              {tab === 'vocabulary' &&
                bank.vocabulary.map((q) => (
                  <QuestionRow
                    key={q.id}
                    title={q.sentence}
                    subtitle={`Correct: ${q.correctAnswer}`}
                    onEdit={() => {
                      setEditingId(q.id)
                      setFormOpen(true)
                    }}
                    onDelete={() => deleteListItem('vocabulary', q.id)}
                  />
                ))}
              {tab === 'listening' &&
                bank.listening.map((q) => (
                  <QuestionRow
                    key={q.id}
                    title={q.question}
                    subtitle={`Correct: ${q.options[q.correctIndex]}`}
                    preview={
                      <span className="flex items-center gap-3">
                        {q.imageUrl && (
                          <Image
                            src={q.imageUrl}
                            alt={`Image for: ${q.question}`}
                            width={64}
                            height={48}
                            className="h-12 w-16 rounded object-cover"
                          />
                        )}
                        {q.audioUrl && (
                          <audio controls src={q.audioUrl} className="h-8 max-w-44" />
                        )}
                      </span>
                    }
                    onEdit={() => {
                      setEditingId(q.id)
                      setFormOpen(true)
                    }}
                    onDelete={() => deleteListItem('listening', q.id)}
                  />
                ))}
              {counts[tab] === 0 && !formOpen && (
                <p className="text-sm text-gray-400">
                  No {tab} questions yet — add the first one!
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function QuestionRow({
  title,
  subtitle,
  preview,
  onEdit,
  onDelete,
}: {
  title: string
  subtitle: string
  preview?: React.ReactNode
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-deep-blue">{title}</p>
        <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
        {preview && <div className="mt-2">{preview}</div>}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="secondary" onClick={onEdit}>
          Edit
        </Button>
        <Button size="sm" variant="danger" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </Card>
  )
}
