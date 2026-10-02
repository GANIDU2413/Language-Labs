'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Timestamp } from 'firebase/firestore'
import {
  addDocument,
  deleteDocument,
  getCollection,
  updateDocument,
} from '@/lib/firestore'
import { uploadFileWithProgress } from '@/lib/storage'
import { formatDate, getYouTubeId } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { toast } from '@/hooks/useToast'
import type { Resource, ResourceType } from '@/types'

const resourceSchema = z
  .object({
    type: z.enum(['pdf', 'youtube', 'text']),
    title: z.string().min(2, 'Title must be at least 2 characters'),
    description: z.string().optional(),
    visibility: z.enum(['free', 'lab']),
    unlockWeek: z.preprocess(
      (v) => (v === '' || v === undefined ? undefined : v),
      z.coerce
        .number()
        .int()
        .min(1, 'Week must be 1–16')
        .max(16, 'Week must be 1–16')
        .optional()
    ),
    youtubeUrl: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    content: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.visibility === 'lab' && data.unlockWeek === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['unlockWeek'],
        message: 'Choose the unlock week (1–16)',
      })
    }
    if (data.type === 'youtube' && !getYouTubeId(data.youtubeUrl ?? '')) {
      ctx.addIssue({
        code: 'custom',
        path: ['youtubeUrl'],
        message: 'Enter a valid YouTube link',
      })
    }
    if (data.type === 'text' && !data.content?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['content'],
        message: 'Write the post content',
      })
    }
  })

type ResourceInput = z.input<typeof resourceSchema>
type ResourceForm = z.output<typeof resourceSchema>

const typeBadge: Record<ResourceType, string> = {
  pdf: '📄 PDF',
  youtube: '▶️ YouTube',
  text: '📝 Text',
}

export default function UploadResourcesPage() {
  const [resources, setResources] = useState<Resource[] | null>(null)
  const [editing, setEditing] = useState<Resource | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [uploadPct, setUploadPct] = useState<number | null>(null)
  const [serverError, setServerError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [deleting, setDeleting] = useState<Resource | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResourceInput, unknown, ResourceForm>({
    resolver: zodResolver(resourceSchema),
    defaultValues: { type: 'pdf', visibility: 'free' },
  })

  const type = watch('type')
  const visibility = watch('visibility')

  useEffect(() => {
    getCollection<Resource>('resources')
      .then((all) =>
        setResources(
          all.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
        )
      )
      .catch(() => setResources([]))
  }, [])

  function startEdit(resource: Resource) {
    setEditing(resource)
    setFile(null)
    setFileError('')
    setSavedMessage('')
    reset({
      type: resource.type,
      title: resource.title,
      description: resource.description ?? '',
      visibility: resource.isFree ? 'free' : 'lab',
      unlockWeek: resource.unlockWeek,
      youtubeUrl: resource.youtubeUrl ?? '',
      thumbnailUrl: resource.thumbnailUrl ?? '',
      content: resource.content ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditing(null)
    setFile(null)
    setFileError('')
    reset({ type: 'pdf', visibility: 'free', title: '', description: '' })
  }

  async function onSubmit(data: ResourceForm) {
    setServerError('')
    setFileError('')
    setSavedMessage('')

    // PDF file is validated here (outside zod) because edits may keep the old file
    if (data.type === 'pdf' && !file && !editing?.fileUrl) {
      setFileError('Choose a PDF file to upload')
      return
    }

    try {
      let fileUrl = editing?.fileUrl
      if (data.type === 'pdf' && file) {
        setUploadPct(0)
        fileUrl = await uploadFileWithProgress(
          file,
          `resources/pdfs/${Date.now()}-${file.name}`,
          setUploadPct
        )
        setUploadPct(null)
      }

      const randomMiniIndex = Math.floor(Math.random() * 11) + 1
      const randomThumbnailImage = `/images/mini-images/mini-c-${randomMiniIndex}.png`

      const docData = {
        type: data.type,
        title: data.title.trim(),
        ...(data.description?.trim()
          ? { description: data.description.trim() }
          : {}),
        isFree: data.visibility === 'free',
        ...(data.visibility === 'lab' ? { unlockWeek: data.unlockWeek } : {}),
        ...(data.type === 'pdf' && fileUrl ? { fileUrl } : {}),
        ...(data.type === 'youtube'
          ? {
              youtubeUrl: data.youtubeUrl,
              ...(data.thumbnailUrl?.trim()
                ? { thumbnailUrl: data.thumbnailUrl.trim() }
                : {}),
            }
          : {}),
        ...(data.type === 'text' ? { content: data.content } : {}),
        ...((data.type === 'pdf' || data.type === 'text')
          ? {
              thumbnailImage:
                editing?.thumbnailImage || randomThumbnailImage,
            }
          : {}),
      }

      if (editing) {
        await updateDocument<Resource>('resources', editing.id, docData)
        setResources(
          (current) =>
            current?.map((r) =>
              r.id === editing.id ? ({ ...r, ...docData } as Resource) : r
            ) ?? null
        )
        toast.success('Resource updated.')
      } else {
        const createdAt = Timestamp.now()
        const id = await addDocument<Resource>('resources', {
          ...docData,
          createdAt,
        } as Omit<Resource, 'id'>)
        setResources((current) => [
          { id, ...docData, createdAt } as Resource,
          ...(current ?? []),
        ])
        toast.success('Resource published.')
      }
      cancelEdit()
    } catch {
      setUploadPct(null)
      toast.error('Could not save the resource. Please try again.')
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteDocument('resources', deleting.id)
      setResources(
        (current) => current?.filter((r) => r.id !== deleting.id) ?? null
      )
      setDeleting(null)
      toast.success('Resource deleted.')
    } catch {
      toast.error('Delete failed. Please try again.')
    } finally {
      setDeleteBusy(false)
    }
  }

  const selectClass =
    'rounded-lab border border-gray-300 bg-lab-white px-4 py-2.5 text-deep-blue outline-none focus:border-deep-blue'

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-deep-blue">Upload Resources 📁</h1>
      <p className="mt-1 text-sm text-gray-500">
        Publish free materials for everyone or week-locked content for enrolled
        students.
      </p>

      {/* Form */}
      <Card className="mt-6 max-w-2xl">
        {editing && (
          <p className="mb-4 rounded-lab bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            ✏️ Editing “{editing.title}” —{' '}
            <button onClick={cancelEdit} className="font-semibold underline">
              cancel
            </button>
          </p>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="type" className="text-sm font-medium text-deep-blue">
              Resource Type
            </label>
            <select id="type" {...register('type')} className={selectClass}>
              <option value="pdf">PDF</option>
              <option value="youtube">YouTube Link</option>
              <option value="text">Text Post</option>
            </select>
          </div>

          <Input
            label="Title"
            name="title"
            placeholder="Week 1 — Everyday Greetings"
            required
            register={register('title')}
            error={errors.title?.message}
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="description"
              className="text-sm font-medium text-deep-blue"
            >
              Description
            </label>
            <textarea
              id="description"
              rows={2}
              placeholder="A short note about this resource (optional)"
              {...register('description')}
              className="rounded-lab border border-gray-300 bg-lab-white px-4 py-2.5 text-deep-blue placeholder:text-gray-400 outline-none focus:border-deep-blue"
            />
          </div>

          {/* Visibility */}
          <fieldset>
            <legend className="text-sm font-medium text-deep-blue">
              Visibility
            </legend>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  value="free"
                  {...register('visibility')}
                  className="accent-electric-blue"
                />
                Free — visible to everyone
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  value="lab"
                  {...register('visibility')}
                  className="accent-electric-blue"
                />
                Lab Session — enrolled students only
              </label>
            </div>
            {visibility === 'free' && (
              <p className="mt-2 text-xs text-gray-500">
                {type === 'youtube' && (
                  <span>
                    🎬 <strong>Inside the Lab:</strong> Free YouTube links appear exclusively under the homepage &ldquo;Inside the Lab&rdquo; section.
                  </span>
                )}
                {type === 'pdf' && (
                  <span>
                    📄 <strong>Free Resources (1st Row):</strong> Free PDF uploads appear exclusively in the 1st row of the homepage &ldquo;Free Resources&rdquo; section.
                  </span>
                )}
                {type === 'text' && (
                  <span>
                    📝 <strong>Free Resources (2nd Row):</strong> Free text posts appear exclusively in the 2nd row of the homepage &ldquo;Free Resources&rdquo; section.
                  </span>
                )}
              </p>
            )}
          </fieldset>

          {visibility === 'lab' && (
            <Input
              label="Unlock at Week"
              name="unlockWeek"
              type="number"
              placeholder="1–16"
              required
              register={register('unlockWeek')}
              error={errors.unlockWeek?.message}
            />
          )}

          {/* Type-specific fields */}
          {type === 'pdf' && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="file"
                className="text-sm font-medium text-deep-blue"
              >
                PDF File{' '}
                {editing?.fileUrl && (
                  <span className="font-normal text-gray-400">
                    (leave empty to keep the current file)
                  </span>
                )}
              </label>
              <input
                id="file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="rounded-lab border border-gray-300 bg-lab-white px-4 py-2 text-sm text-gray-600 file:mr-3 file:rounded-lab file:border-0 file:bg-electric-blue file:px-4 file:py-1.5 file:font-semibold file:text-lab-white"
              />
              {fileError && (
                <p className="text-sm text-seat-reserved">{fileError}</p>
              )}
              {uploadPct !== null && (
                <div className="mt-1">
                  <div className="h-2 overflow-hidden rounded-full bg-blue-light">
                    <div
                      className="h-full rounded-full bg-electric-blue transition-[width]"
                      style={{ width: `${uploadPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Uploading… {uploadPct}%
                  </p>
                </div>
              )}
            </div>
          )}

          {type === 'youtube' && (
            <>
              <Input
                label="YouTube URL"
                name="youtubeUrl"
                placeholder="https://www.youtube.com/watch?v=…"
                required
                register={register('youtubeUrl')}
                error={errors.youtubeUrl?.message}
              />
              <Input
                label="Thumbnail URL"
                name="thumbnailUrl"
                placeholder="Optional — auto-generated from the video if empty"
                register={register('thumbnailUrl')}
                error={errors.thumbnailUrl?.message}
              />
            </>
          )}

          {type === 'text' && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="content"
                className="text-sm font-medium text-deep-blue"
              >
                Post Content <span className="text-seat-reserved">*</span>
              </label>
              <textarea
                id="content"
                rows={6}
                placeholder="Write your post here…"
                {...register('content')}
                className="rounded-lab border border-gray-300 bg-lab-white px-4 py-2.5 text-deep-blue placeholder:text-gray-400 outline-none focus:border-deep-blue"
              />
              {errors.content && (
                <p className="text-sm text-seat-reserved">
                  {errors.content.message}
                </p>
              )}
            </div>
          )}

          {serverError && (
            <p className="rounded-lab bg-red-50 px-4 py-3 text-sm text-seat-reserved">
              {serverError}
            </p>
          )}
          {savedMessage && (
            <p className="rounded-lab bg-green-50 px-4 py-3 text-sm text-green-700">
              {savedMessage}
            </p>
          )}

          <Button type="submit" size="lg" loading={isSubmitting}>
            {editing ? 'Update Resource' : 'Publish Resource'}
          </Button>
        </form>
      </Card>

      {/* Existing resources */}
      <h2 className="mt-10 text-lg font-bold text-deep-blue">All Resources</h2>
      {!resources ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="md" />
        </div>
      ) : resources.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">No resources uploaded yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lab bg-lab-white shadow-sm">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead>
              <tr className="border-b border-blue-light text-gray-500">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Access</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource.id} className="border-b border-blue-light/60">
                  <td className="px-4 py-3 font-medium text-deep-blue">
                    <div className="flex items-center gap-2.5">
                      {resource.thumbnailImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resource.thumbnailImage}
                          alt=""
                          className="h-8 w-6 object-contain shrink-0 drop-shadow-xs"
                        />
                      )}
                      <span>{resource.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="info">{typeBadge[resource.type]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {resource.isFree ? (
                      resource.type === 'youtube' ? (
                        <Badge variant="success">Free • Inside the Lab</Badge>
                      ) : resource.type === 'pdf' ? (
                        <Badge variant="success">Free • Row 1 (PDF)</Badge>
                      ) : (
                        <Badge variant="success">Free • Row 2 (Text)</Badge>
                      )
                    ) : (
                      <Badge variant="warning">
                        Week {resource.unlockWeek}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(resource.createdAt.toDate())}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => startEdit(resource)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setDeleting(resource)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-blue/60 px-4">
          <Card className="w-full max-w-sm text-center">
            <p className="text-3xl">🗑️</p>
            <h3 className="mt-2 font-bold text-deep-blue">
              Delete “{deleting.title}”?
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Students will no longer see this resource. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setDeleting(null)}
                disabled={deleteBusy}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={deleteBusy}
                onClick={confirmDelete}
              >
                Yes, Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
