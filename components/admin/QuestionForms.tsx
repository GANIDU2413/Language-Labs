'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { ReadingQuestion, VocabularyQuestion } from '@/types'

export const textareaClass =
  'rounded-lab border border-gray-300 bg-lab-white px-4 py-2.5 text-deep-blue placeholder:text-gray-400 outline-none focus:border-deep-blue'

// ---------------------------------------------------------------------------
// Shared 4-option + correct-radio block
// ---------------------------------------------------------------------------

export function OptionInputs({
  register,
  errors,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-deep-blue">
        Answer options — tick the correct one
      </legend>
      <div className="mt-2 flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              type="radio"
              value={i}
              {...register('correctIndex')}
              className="accent-electric-blue"
              aria-label={`Option ${i + 1} is correct`}
            />
            <div className="flex-1">
              <input
                placeholder={`Option ${i + 1}`}
                {...register(`options.${i}`)}
                className="w-full rounded-lab border border-gray-300 bg-lab-white px-4 py-2 text-sm text-deep-blue outline-none focus:border-deep-blue"
              />
              {errors.options?.[i] && (
                <p className="mt-0.5 text-xs text-seat-reserved">
                  {errors.options[i].message}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  )
}

export function FormActions({
  saving,
  editing,
  onCancel,
}: {
  saving: boolean
  editing: boolean
  onCancel: () => void
}) {
  return (
    <div className="flex gap-3">
      <Button type="submit" loading={saving}>
        {editing ? 'Update Question' : 'Add Question'}
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reading question form (paragraph + one MCQ)
// ---------------------------------------------------------------------------

const readingSchema = z.object({
  paragraph: z.string().min(10, 'Paragraph is too short'),
  question: z.string().min(3, 'Question is required'),
  options: z.array(z.string().min(1, 'Required')).length(4),
  correctIndex: z.coerce.number().min(0).max(3),
})
type ReadingFormData = z.output<typeof readingSchema>

export function ReadingForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial?: ReadingQuestion
  saving: boolean
  onSave: (q: ReadingQuestion) => void
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof readingSchema>, unknown, ReadingFormData>({
    resolver: zodResolver(readingSchema),
    defaultValues: initial
      ? {
          paragraph: initial.paragraph,
          question: initial.questions[0]?.question ?? '',
          options: initial.questions[0]?.options ?? ['', '', '', ''],
          correctIndex: initial.questions[0]?.correctIndex ?? 0,
        }
      : { options: ['', '', '', ''], correctIndex: 0 },
  })

  function submit(data: ReadingFormData) {
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      paragraph: data.paragraph.trim(),
      questions: [
        {
          id: initial?.questions[0]?.id ?? crypto.randomUUID(),
          question: data.question.trim(),
          options: data.options.map((o) => o.trim()),
          correctIndex: data.correctIndex,
        },
      ],
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-deep-blue">Paragraph</label>
        <textarea rows={4} {...register('paragraph')} className={textareaClass} />
        {errors.paragraph && (
          <p className="text-sm text-seat-reserved">{errors.paragraph.message}</p>
        )}
      </div>
      <Input
        label="Question"
        name="question"
        required
        register={register('question')}
        error={errors.question?.message}
      />
      <OptionInputs register={register} errors={errors} />
      <FormActions saving={saving} editing={!!initial} onCancel={onCancel} />
    </form>
  )
}

// ---------------------------------------------------------------------------
// Vocabulary question form (sentence with ___ + correct/wrong words)
// ---------------------------------------------------------------------------

const vocabularySchema = z.object({
  sentence: z
    .string()
    .min(5, 'Sentence is required')
    .refine((s) => /_{2,}/.test(s), {
      message: 'Include the blank as ___ in the sentence',
    }),
  correctWord: z.string().min(1, 'Correct word is required'),
  wrong1: z.string().min(1, 'Required'),
  wrong2: z.string().min(1, 'Required'),
  wrong3: z.string().min(1, 'Required'),
})
type VocabularyFormData = z.output<typeof vocabularySchema>

export function VocabularyForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial?: VocabularyQuestion
  saving: boolean
  onSave: (q: VocabularyQuestion) => void
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VocabularyFormData>({
    resolver: zodResolver(vocabularySchema),
    defaultValues: initial
      ? {
          sentence: initial.sentence,
          correctWord: initial.correctAnswer,
          wrong1: initial.options[1] ?? '',
          wrong2: initial.options[2] ?? '',
          wrong3: initial.options[3] ?? '',
        }
      : undefined,
  })

  function submit(data: VocabularyFormData) {
    const correct = data.correctWord.trim()
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      sentence: data.sentence.trim(),
      correctAnswer: correct,
      options: [correct, data.wrong1.trim(), data.wrong2.trim(), data.wrong3.trim()],
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-deep-blue">
          Sentence (use ___ for the blank)
        </label>
        <textarea
          rows={2}
          placeholder="She was very ___ about the results."
          {...register('sentence')}
          className={textareaClass}
        />
        {errors.sentence && (
          <p className="text-sm text-seat-reserved">{errors.sentence.message}</p>
        )}
      </div>
      <Input
        label="Correct Word"
        name="correctWord"
        required
        register={register('correctWord')}
        error={errors.correctWord?.message}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="Wrong Word 1" name="wrong1" required register={register('wrong1')} error={errors.wrong1?.message} />
        <Input label="Wrong Word 2" name="wrong2" required register={register('wrong2')} error={errors.wrong2?.message} />
        <Input label="Wrong Word 3" name="wrong3" required register={register('wrong3')} error={errors.wrong3?.message} />
      </div>
      <FormActions saving={saving} editing={!!initial} onCancel={onCancel} />
    </form>
  )
}
