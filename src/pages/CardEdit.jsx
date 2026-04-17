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
import PrioritySlider from '../components/PrioritySlider'
import { Eye, EyeOff } from 'lucide-react'

const OCCASIONS = [
  'Good Morning', 'Good Night', 'Birthday', 'Anniversary', 'Wedding',
  'Festival', 'Motivation', 'Love', 'Breakup', 'Friendship', 'Success', 'General',
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

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      category_id: '',
      language_id: '',
      occasions: [],
      festival_id: '',
      tags: [],
      priority: 5,
      status: 'draft',
      scheduled_at: '',
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
    }
  }, [card, reset])

  const selectedOccasions = watch('occasions') || []
  const selectedStatus = watch('status')
  const hasFestivalOccasion = selectedOccasions.includes('Festival')

  const toggleOccasion = (occ) => {
    const current = watch('occasions') || []
    if (current.includes(occ)) {
      setValue('occasions', current.filter((o) => o !== occ))
    } else {
      setValue('occasions', [...current, occ])
    }
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
      })
      navigate('/cards')
    } catch {
      // handled in hook
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[#E8E2D9] rounded w-1/3" />
          <div className="h-48 bg-[#E8E2D9] rounded-xl" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-[#E8E2D9] rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="p-6 text-center text-[#6B6358]">Card not found.</div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/cards')} className="text-sm text-[#6B6358] hover:text-[#1A1612]">← Back</button>
          <span className="text-sm text-[#A89E93]">/</span>
          <h1 className="text-lg font-semibold text-[#1A1612]">Edit Card</h1>
        </div>
        <div className="flex items-center gap-2">
          {card.status === 'published' ? (
            <button
              onClick={() => unpublishCard.mutate(id)}
              disabled={unpublishCard.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-700 text-xs font-medium hover:bg-yellow-100 transition-all"
            >
              <EyeOff size={14} />
              Unpublish
            </button>
          ) : (
            <button
              onClick={() => publishCard.mutate(id)}
              disabled={publishCard.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-green-300 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-all"
            >
              <Eye size={14} />
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Current image */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#1A1612]">Image</label>
        {!newImageFile && card.image_url && (
          <div className="rounded-xl overflow-hidden border border-[#E8E2D9] h-48 relative">
            <img
              src={getCardThumbUrl(card.image_url)}
              alt="Current"
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">
              Current image
            </span>
          </div>
        )}
        <ImageUploader
          value={newImageFile}
          onChange={setNewImageFile}
          label="Replace Image (optional)"
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-[#1A1612] mb-1.5">Category <span className="text-red-500">*</span></label>
          <select
            {...register('category_id', { required: 'Category is required' })}
            className="w-full px-3 py-2.5 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1612] focus:outline-none focus:border-[#FF6B00] bg-white"
          >
            <option value="">Select category…</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
          {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id.message}</p>}
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-[#1A1612] mb-1.5">Language <span className="text-red-500">*</span></label>
          <select
            {...register('language_id', { required: 'Language is required' })}
            className="w-full px-3 py-2.5 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1612] focus:outline-none focus:border-[#FF6B00] bg-white"
          >
            <option value="">Select language…</option>
            {languages?.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          {errors.language_id && <p className="text-red-500 text-xs mt-1">{errors.language_id.message}</p>}
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
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selectedOccasions.includes(occ)
                    ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                    : 'bg-white border-[#E8E2D9] text-[#6B6358] hover:border-[#FF6B00]/50'
                }`}
              >
                {occ}
              </button>
            ))}
          </div>
        </div>

        {/* Festival Link */}
        {hasFestivalOccasion && (
          <div>
            <label className="block text-sm font-medium text-[#1A1612] mb-1.5">Festival Link</label>
            <select
              {...register('festival_id')}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1612] focus:outline-none focus:border-[#FF6B00] bg-white"
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

        {/* Priority */}
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <PrioritySlider value={field.value} onChange={field.onChange} />
          )}
        />

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-[#1A1612] mb-2">Status</label>
          <div className="flex gap-2">
            {['draft', 'published', 'scheduled'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setValue('status', s)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize border transition-all ${
                  selectedStatus === s
                    ? s === 'published'
                      ? 'bg-green-500 text-white border-green-500'
                      : s === 'scheduled'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-yellow-500 text-white border-yellow-500'
                    : 'bg-white border-[#E8E2D9] text-[#6B6358] hover:border-[#FF6B00]/40'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {selectedStatus === 'scheduled' && (
          <div>
            <label className="block text-sm font-medium text-[#1A1612] mb-1.5">Schedule At</label>
            <input
              type="datetime-local"
              {...register('scheduled_at', {
                required: selectedStatus === 'scheduled' ? 'Schedule date is required' : false,
              })}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1612] focus:outline-none focus:border-[#FF6B00]"
            />
            {errors.scheduled_at && <p className="text-red-500 text-xs mt-1">{errors.scheduled_at.message}</p>}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || updateCard.isPending}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
        >
          {isSubmitting || updateCard.isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Updating…
            </>
          ) : (
            'Update Card'
          )}
        </button>
      </form>
    </div>
  )
}
