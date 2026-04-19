import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'

import { useCard, useUpdateCard, usePublishCard, useUnpublishCard } from '../hooks/useCards'
import { useCategories } from '../hooks/useCategories'
import { useLanguages } from '../hooks/useLanguages'
import { useFestivals } from '../hooks/useFestivals'
import { getCardThumbUrl } from '../lib/supabase'
import ImageUploader from '../components/ImageUploader'
import TagInput from '../components/TagInput'
import { Eye, EyeOff } from 'lucide-react'

const OCCASIONS = [
  'Good Morning', 'Good Night', 'Birthday', 'Anniversary', 'Wedding',
  'Festival', 'Motivation', 'Love', 'Breakup', 'Friendship', 'Success', 'General',
]

const PRIORITY_OPTIONS = [
  { label: 'Normal', value: 5, activeClass: 'bg-gray-500 border-gray-500 text-white' },
  { label: 'Important', value: 8, activeClass: 'bg-yellow-500 border-yellow-500 text-white' },
  { label: 'Hero', value: 10, activeClass: 'bg-[#FF6B00] border-[#FF6B00] text-white' },
]

export default function CardEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: card, isLoading } = useCard(id)
  const { data: categories } = useCategories()
  const { data: languages } = useLanguages()
  const { data: festivals } = useFestivals()
  const updateCard = useUpdateCard()
  const publishCard = usePublishCard()
  const unpublishCard = useUnpublishCard()
  const [newImageFile, setNewImageFile] = useState(null)
  const [contentText, setContentText] = useState('')

  const {
    register, handleSubmit, control, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      category_id: '', language_id: '', occasions: [], festival_id: '',
      tags: [], priority: 5, status: 'draft', scheduled_at: '',
    },
  })

  useEffect(() => {
    if (card) {
      reset({
        category_id: card.category_id || '',
        language_id: card.language_id || '',
        occasions: card.occasions || [],
        festival_id: card.festival_id || '',
        tags: card.tags || [],
        priority: card.priority || 5,
        status: card.status || 'draft',
        scheduled_at: card.scheduled_at ? card.scheduled_at.slice(0, 16) : '',
      })
      setContentText(card.content_text || '')
    }
  }, [card, reset])

  const selectedOccasions = watch('occasions') || []
  const selectedStatus = watch('status')
  const selectedPriority = watch('priority')
  const hasFestivalOccasion = selectedOccasions.includes('Festival')

  const toggleOccasion = (occ) => {
    const current = watch('occasions') || []
    setValue('occasions', current.includes(occ) ? current.filter((o) => o !== occ) : [...current, occ])
  }

  const onSubmit = async (data) => {
    try {
      await updateCard.mutateAsync({
        id,
        file: newImageFile || undefined,
        image_url: card.image_url,
        category_id: data.category_id || null,
        language_id: data.language_id || null,
        festival_id: data.festival_id || null,
        occasions: data.occasions || [],
        tags: data.tags || [],
        priority: data.priority,
        status: data.status,
        scheduled_at: data.status === 'scheduled' ? data.scheduled_at : null,
        content_text: contentText || null,
        content_text_language: 'te',
      })
      navigate('/cards')
    } catch {
      // handled in hook
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[#E8E2D9] rounded w-1/3" />
          <div className="h-48 bg-[#E8E2D9] rounded-xl" />
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-[#E8E2D9] rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!card) {
    return <div className="p-6 text-center text-[#6B6358]">Card not found.</div>
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/cards')} className="text-sm text-[#6B6358] min-h-[44px] flex items-center">
            ← Back
          </button>
          <span className="text-sm text-[#A89E93]">/</span>
          <h1 className="text-lg font-semibold text-[#1A1612]">Edit Card</h1>
        </div>
        <div className="flex items-center gap-2">
          {card.status === 'published' ? (
            <button
              onClick={() => unpublishCard.mutate(id)}
              disabled={unpublishCard.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-700 text-xs font-medium min-h-[44px]"
            >
              <EyeOff size={14} /> Unpublish
            </button>
          ) : (
            <button
              onClick={() => publishCard.mutate(id)}
              disabled={publishCard.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-green-300 bg-green-50 text-green-700 text-xs font-medium min-h-[44px]"
            >
              <Eye size={14} /> Publish
            </button>
          )}
        </div>
      </div>

      {/* Current image */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#1A1612]">Image</label>
        {!newImageFile && card.image_url && (
          <div className="rounded-xl overflow-hidden border border-[#E8E2D9] mx-auto max-w-[140px]">
            <div className="aspect-[9/16]">
              <img src={getCardThumbUrl(card.image_url)} alt="Current" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
        <ImageUploader value={newImageFile} onChange={setNewImageFile} label="Replace Image (optional)" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Content Text */}
        <div>
          <label className="block text-sm font-medium text-[#1A1612] mb-1.5">Content Text</label>
          <textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Type the quote, dialogue, or message shown in this image…"
            className="w-full px-3 py-3 rounded-xl border border-[#E8E2D9] text-sm focus:outline-none focus:border-[#FF6B00] resize-none"
          />
          <p className="text-xs text-[#A89E93] mt-1">Used for search and recommendations</p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-[#1A1612] mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categories?.map((c) => (
              <label key={c.id} className="cursor-pointer">
                <input type="radio" {...register('category_id', { required: 'Category is required' })} value={c.id} className="sr-only" />
                <div className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 transition-all min-h-[56px] ${
                  watch('category_id') === c.id ? 'border-[#FF6B00] bg-[#FFF0E6]' : 'border-[#E8E2D9] bg-white'
                }`}>
                  <span className="text-xl">{c.emoji}</span>
                  <span className="text-sm font-medium text-[#1A1612]">{c.name}</span>
                </div>
              </label>
            ))}
          </div>
          {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id.message}</p>}
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-[#1A1612] mb-2">Language</label>
          <div className="grid grid-cols-2 gap-2">
            {languages?.map((l) => (
              <label key={l.id} className="cursor-pointer">
                <input type="radio" {...register('language_id')} value={l.id} className="sr-only" />
                <div className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 transition-all min-h-[56px] ${
                  watch('language_id') === l.id ? 'border-[#FF6B00] bg-[#FFF0E6]' : 'border-[#E8E2D9] bg-white'
                }`}>
                  <span className="text-sm font-medium text-[#1A1612]">{l.name}</span>
                  {l.code && <span className="text-xs text-[#A89E93] ml-auto">{l.code}</span>}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Occasions */}
        <div>
          <label className="block text-sm font-medium text-[#1A1612] mb-2">Occasions</label>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((occ) => (
              <button
                key={occ}
                type="button"
                onClick={() => toggleOccasion(occ)}
                className={`px-3 py-2 rounded-full text-sm font-medium border transition-all min-h-[44px] ${
                  selectedOccasions.includes(occ)
                    ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                    : 'bg-white border-[#E8E2D9] text-[#6B6358]'
                }`}
              >
                {occ}
              </button>
            ))}
          </div>
        </div>

        {hasFestivalOccasion && (
          <div>
            <label className="block text-sm font-medium text-[#1A1612] mb-1.5">Festival Link</label>
            <select
              {...register('festival_id')}
              className="w-full px-3 py-3 rounded-xl border border-[#E8E2D9] text-sm focus:outline-none focus:border-[#FF6B00] bg-white min-h-[48px]"
            >
              <option value="">Select festival…</option>
              {festivals?.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.festival_date})</option>
              ))}
            </select>
          </div>
        )}

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-[#1A1612] mb-1.5">Tags</label>
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <TagInput
                tags={field.value || []}
                onAdd={(tag) => field.onChange([...(field.value || []), tag])}
                onRemove={(tag) => field.onChange((field.value || []).filter((t) => t !== tag))}
              />
            )}
          />
        </div>

        {/* Priority — 3-button selector */}
        <div>
          <label className="block text-sm font-medium text-[#1A1612] mb-2">Priority</label>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map(({ label, value, activeClass }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue('priority', value)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all min-h-[52px] ${
                  selectedPriority === value ? activeClass : 'border-[#E8E2D9] bg-white text-[#6B6358]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-[#1A1612] mb-2">Status</label>
          <div className="flex gap-2">
            {[
              { value: 'draft', label: 'Draft', cls: 'bg-yellow-500 border-yellow-500 text-white' },
              { value: 'published', label: 'Published', cls: 'bg-green-500 border-green-500 text-white' },
              { value: 'scheduled', label: 'Scheduled', cls: 'bg-blue-500 border-blue-500 text-white' },
            ].map(({ value, label: lbl, cls }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue('status', value)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all min-h-[52px] capitalize ${
                  selectedStatus === value ? cls : 'bg-white border-[#E8E2D9] text-[#6B6358]'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {selectedStatus === 'scheduled' && (
          <div>
            <label className="block text-sm font-medium text-[#1A1612] mb-1.5">Schedule At</label>
            <input
              type="datetime-local"
              {...register('scheduled_at', { required: selectedStatus === 'scheduled' })}
              className="w-full px-3 py-3 rounded-xl border border-[#E8E2D9] text-sm focus:outline-none focus:border-[#FF6B00] min-h-[48px]"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || updateCard.isPending}
          className="w-full py-4 rounded-xl text-white font-semibold text-base disabled:opacity-60 flex items-center justify-center gap-2 min-h-[56px]"
          style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
        >
          {isSubmitting || updateCard.isPending ? (
            <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Updating…</>
          ) : (
            'Update Card'
          )}
        </button>
      </form>
    </div>
  )
}
