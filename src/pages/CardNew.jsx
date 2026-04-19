import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Upload, Layers, Check, ChevronRight, X, Sparkles, CheckCircle } from 'lucide-react'

import { useCreateCard } from '../hooks/useCards'
import { useCategories } from '../hooks/useCategories'
import { useLanguages } from '../hooks/useLanguages'
import { useFestivals } from '../hooks/useFestivals'
import { useBackgrounds } from '../hooks/useBackgrounds'
import { getBgUrl, getCardThumbUrl } from '../lib/supabase'
import ImageUploader from '../components/ImageUploader'
import CardPreview from '../components/CardPreview'
import TagInput from '../components/TagInput'
import AIGenerateModal from '../components/AIGenerateModal'

const OCCASIONS = [
  'Good Morning', 'Good Night', 'Birthday', 'Anniversary', 'Wedding',
  'Festival', 'Motivation', 'Love', 'Breakup', 'Friendship', 'Success', 'General',
]

const TEXT_COLORS = [
  { label: 'White', value: '#FFFFFF' },
  { label: 'Saffron', value: '#FF6B00' },
  { label: 'Gold', value: '#FFB800' },
  { label: 'Black', value: '#000000' },
]

const FONT_SIZES = [
  { label: 'S', value: 18 },
  { label: 'M', value: 24 },
  { label: 'L', value: 32 },
  { label: 'XL', value: 40 },
]

const PRIORITY_OPTIONS = [
  { label: 'Normal', value: 5, color: 'bg-gray-500 border-gray-500' },
  { label: 'Important', value: 8, color: 'bg-yellow-500 border-yellow-500' },
  { label: 'Hero', value: 10, color: 'bg-[#FF6B00] border-[#FF6B00]' },
]

async function cropTo916(file) {
  const TARGET = 9 / 16
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = img.width / img.height
      let sx, sy, sw, sh
      if (ratio > TARGET) { sh = img.height; sw = sh * TARGET; sx = (img.width - sw) / 2; sy = 0 }
      else { sw = img.width; sh = sw / TARGET; sx = 0; sy = (img.height - sh) / 2 }
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(sw); canvas.height = Math.round(sh)
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', 0.92)
    }
    img.src = url
  })
}

export default function CardNew() {
  const [searchParams] = useSearchParams()
  const presetFestivalId = searchParams.get('festival_id')
  const presetFestivalName = searchParams.get('festival_name')
  const navigate = useNavigate()
  const createCard = useCreateCard()
  const previewRef = useRef(null)

  const { data: categories } = useCategories()
  const { data: languages } = useLanguages()
  const { data: festivals } = useFestivals()

  // Flow & step
  const [step, setStep] = useState(1)
  const [flow, setFlow] = useState(null) // 'upload' | 'build'

  // Upload flow
  const [imageFile, setImageFile] = useState(null)
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState(null)
  const [contentText, setContentText] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkItems, setBulkItems] = useState([]) // [{file, previewUrl, contentText}]
  const [bulkPublishing, setBulkPublishing] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })

  // Build flow
  const [bgCategoryId, setBgCategoryId] = useState('')
  const [selectedBg, setSelectedBg] = useState(null)
  const [overlayText, setOverlayText] = useState('')
  const [fontSize, setFontSize] = useState(24)
  const [fontColor, setFontColor] = useState('#FFFFFF')
  const [textPosition, setTextPosition] = useState('center')
  const [bold, setBold] = useState(false)
  const [shadow, setShadow] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatedPreviewUrl, setGeneratedPreviewUrl] = useState(null)
  const [generatedBlob, setGeneratedBlob] = useState(null)
  const [showAIModal, setShowAIModal] = useState(false)

  // Confirmation
  const [createdCard, setCreatedCard] = useState(null)
  const [redirectTimer, setRedirectTimer] = useState(null)

  const { data: backgrounds } = useBackgrounds(bgCategoryId || undefined)

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      category_id: '',
      language_id: '',
      occasions: [],
      festival_id: presetFestivalId || '',
      tags: [],
      priority: 5,
      status: 'published',
      scheduled_at: '',
    },
  })

  const selectedOccasions = watch('occasions') || []
  const selectedStatus = watch('status')
  const selectedPriority = watch('priority')
  const hasFestivalOccasion = selectedOccasions.includes('Festival')

  // Auto-select festival if passed via URL
  useEffect(() => {
    if (presetFestivalId) {
      setValue('festival_id', presetFestivalId)
      if (!selectedOccasions.includes('Festival')) {
        setValue('occasions', [...selectedOccasions, 'Festival'])
      }
    }
  }, [presetFestivalId])

  const toggleOccasion = (occ) => {
    const current = watch('occasions') || []
    setValue('occasions', current.includes(occ) ? current.filter((o) => o !== occ) : [...current, occ])
  }

  const handleGenerateImage = async () => {
    if (!previewRef.current) return
    setGenerating(true)
    try {
      const blob = await previewRef.current.generateImage()
      const url = URL.createObjectURL(blob)
      setGeneratedBlob(blob)
      setGeneratedPreviewUrl(url)
      const file = new File([blob], `generated-${Date.now()}.jpg`, { type: 'image/jpeg' })
      setImageFile(file)
      setContentText(overlayText)
      toast.success('Image generated!')
    } catch {
      toast.error('Failed to generate image')
    } finally {
      setGenerating(false)
    }
  }

  const handleAIBackground = (url) => {
    setSelectedBg({ id: 'ai-generated', image_url: url, name: 'AI Generated' })
    setShowAIModal(false)
  }

  const proceedToMetadata = () => {
    if (flow === 'upload' && bulkMode && bulkItems.length === 0) { toast.error('Please upload at least one image'); return }
    if (flow === 'upload' && !bulkMode && !imageFile) { toast.error('Please upload an image first'); return }
    if (flow === 'build' && !generatedBlob) { toast.error('Please generate the image first'); return }
    setStep(2)
  }

  const onSubmit = async (data) => {
    if (!imageFile) { toast.error('Image is required'); return }
    try {
      const card = await createCard.mutateAsync({
        file: imageFile,
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
      setCreatedCard(card)
      setStep(3)
      const timer = setTimeout(() => { resetForm() }, 3000)
      setRedirectTimer(timer)
    } catch {
      // error toast handled in hook
    }
  }

  const handleBulkPublishAll = async (data) => {
    const readyItems = bulkItems.filter((i) => i.file)
    if (!readyItems.length) { toast.error('No images to publish'); return }
    setBulkPublishing(true)
    setBulkProgress({ done: 0, total: readyItems.length })
    let done = 0
    for (const item of readyItems) {
      try {
        await createCard.mutateAsync({
          file: item.file,
          category_id: data.category_id || null,
          language_id: data.language_id || null,
          festival_id: data.festival_id || null,
          occasions: data.occasions || [],
          tags: data.tags || [],
          priority: data.priority,
          status: data.status,
          scheduled_at: data.status === 'scheduled' ? data.scheduled_at : null,
          content_text: item.contentText || null,
          content_text_language: 'te',
        })
        done++
        setBulkProgress({ done, total: readyItems.length })
      } catch {
        // continue with remaining
      }
    }
    toast.success(`${done} of ${readyItems.length} cards published!`)
    setBulkPublishing(false)
    navigate('/cards')
  }

  const resetForm = () => {
    if (redirectTimer) clearTimeout(redirectTimer)
    setStep(1); setFlow(null); setImageFile(null)
    setUploadedPreviewUrl(null); setContentText(''); setBulkMode(false)
    setBulkItems([]); setGeneratedBlob(null); setGeneratedPreviewUrl(null)
    setCreatedCard(null); setOverlayText(''); setSelectedBg(null)
  }

  // ── STEP 3: Confirmation ──
  if (step === 3 && createdCard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#F5F3EF]">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 animate-bounce">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#1A1612] mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Card Published!
        </h2>
        <p className="text-[#6B6358] text-sm mb-6">Redirecting to upload another in 3s…</p>

        {createdCard.image_url && (
          <div className="w-32 rounded-xl overflow-hidden border border-[#E8E2D9] mb-6 mx-auto">
            <div className="aspect-[9/16]">
              <img src={getCardThumbUrl(createdCard.image_url)} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={resetForm}
            className="flex-1 py-3 rounded-xl text-white font-semibold text-sm min-h-[52px]"
            style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
          >
            Upload Another
          </button>
          <Link
            to="/cards"
            className="flex-1 py-3 rounded-xl border border-[#E8E2D9] text-[#6B6358] font-medium text-sm flex items-center justify-center min-h-[52px]"
          >
            View All Cards
          </Link>
        </div>
      </div>
    )
  }

  // ── STEP 2: Metadata ──
  if (step === 2) {
    const isBulk = bulkMode && bulkItems.length > 0
    const submitHandler = isBulk
      ? handleSubmit((data) => handleBulkPublishAll(data))
      : handleSubmit(onSubmit)

    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5 pb-20 md:pb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep(1)} className="text-sm text-[#6B6358] hover:text-[#1A1612] min-h-[44px] flex items-center">
            ← Back
          </button>
          <span className="text-sm text-[#A89E93]">/</span>
          <h1 className="text-lg font-semibold text-[#1A1612]">
            {isBulk ? `Card Details (${bulkItems.length} images)` : 'Card Details'}
          </h1>
        </div>

        {/* Image preview(s) */}
        {!isBulk && imageFile && (
          <div className="rounded-xl overflow-hidden border border-[#E8E2D9] mx-auto max-w-[160px]">
            <div className="aspect-[9/16]">
              <img
                src={generatedPreviewUrl || uploadedPreviewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
        {isBulk && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {bulkItems.map((item, idx) => (
              <div key={idx} className="shrink-0 w-16 rounded-lg overflow-hidden border border-[#E8E2D9]">
                <div className="aspect-[9/16]">
                  <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={submitHandler} className="space-y-5">
          {/* Content Text */}
          <div>
            <label className="block text-sm font-medium text-[#1A1612] mb-1.5">
              Content Text <span className="text-red-500">*</span>
            </label>
            {isBulk ? (
              <div className="space-y-2">
                {bulkItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="w-10 shrink-0 rounded-md overflow-hidden border border-[#E8E2D9]">
                      <div className="aspect-[9/16]">
                        <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <textarea
                      value={item.contentText}
                      onChange={(e) => {
                        const updated = [...bulkItems]
                        updated[idx] = { ...updated[idx], contentText: e.target.value }
                        setBulkItems(updated)
                      }}
                      rows={2}
                      placeholder={`Text for image ${idx + 1}…`}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#E8E2D9] text-sm focus:outline-none focus:border-[#FF6B00] resize-none"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Type the quote, dialogue, or message shown in this image…"
                className="w-full px-3 py-3 rounded-xl border border-[#E8E2D9] text-sm focus:outline-none focus:border-[#FF6B00] resize-none"
              />
            )}
            <p className="text-xs text-[#A89E93] mt-1">
              This text helps show this card to the right users. Write exactly what appears in the image.
            </p>
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
                    watch('category_id') === c.id
                      ? 'border-[#FF6B00] bg-[#FFF0E6]'
                      : 'border-[#E8E2D9] bg-white'
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
                    watch('language_id') === l.id
                      ? 'border-[#FF6B00] bg-[#FFF0E6]'
                      : 'border-[#E8E2D9] bg-white'
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

          {/* Festival (conditional) */}
          {hasFestivalOccasion && (
            <div>
              <label className="block text-sm font-medium text-[#1A1612] mb-1.5">Festival Link</label>
              <select
                {...register('festival_id')}
                className="w-full px-3 py-3 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1612] focus:outline-none focus:border-[#FF6B00] bg-white min-h-[48px]"
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
          <div>
            <label className="block text-sm font-medium text-[#1A1612] mb-2">Priority</label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(({ label, value, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('priority', value)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all min-h-[52px] ${
                    selectedPriority === value
                      ? `${color} text-white`
                      : 'border-[#E8E2D9] bg-white text-[#6B6358]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-[#1A1612] mb-2">Publish</label>
            <div className="flex gap-2">
              {[
                { value: 'draft', label: 'Save Draft', cls: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
                { value: 'published', label: 'Publish Now', cls: 'bg-green-500 text-white border-green-500' },
                { value: 'scheduled', label: 'Schedule', cls: 'bg-blue-500 text-white border-blue-500' },
              ].map(({ value, label: lbl, cls }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('status', value)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all min-h-[52px] ${
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
            disabled={isSubmitting || createCard.isPending || bulkPublishing}
            className="w-full py-4 rounded-xl text-white font-semibold text-base disabled:opacity-60 flex items-center justify-center gap-2 min-h-[56px]"
            style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
          >
            {isSubmitting || createCard.isPending || bulkPublishing ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {bulkPublishing ? `Publishing ${bulkProgress.done}/${bulkProgress.total}…` : 'Saving…'}
              </>
            ) : isBulk ? (
              `Publish All ${bulkItems.length} Cards`
            ) : selectedStatus === 'published' ? (
              'Publish Now'
            ) : (
              'Save Card'
            )}
          </button>
        </form>
      </div>
    )
  }

  // ── STEP 1: Method selection ──
  if (!flow) {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <div className="mb-6">
          {presetFestivalName && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-[#FFF0E6] text-[#FF6B00] text-sm font-medium flex items-center gap-2">
              🎉 Creating cards for: <strong>{presetFestivalName}</strong>
            </div>
          )}
          <h1 className="text-2xl font-semibold text-[#1A1612]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Create New Card
          </h1>
          <p className="text-sm text-[#6B6358] mt-1">Choose how you want to create this content card.</p>
        </div>

        <div className="flex flex-col gap-4">
          {[
            {
              key: 'upload',
              emoji: '📤',
              title: 'Upload Image',
              desc: 'Use your own image (photo, designed card)',
            },
            {
              key: 'build',
              emoji: '🎨',
              title: 'Use Background',
              desc: 'Pick a background and add your text',
            },
          ].map(({ key, emoji, title, desc }) => (
            <button
              key={key}
              onClick={() => setFlow(key)}
              className="flex items-center gap-4 p-5 bg-white border-2 border-[#E8E2D9] rounded-2xl hover:border-[#FF6B00]/40 hover:shadow-md transition-all text-left group min-h-[80px]"
            >
              <div className="text-3xl shrink-0">{emoji}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#1A1612] text-base">{title}</h3>
                <p className="text-sm text-[#6B6358] mt-0.5">{desc}</p>
              </div>
              <ChevronRight size={20} className="text-[#A89E93] group-hover:text-[#FF6B00] shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── STEP 1, Flow A: Upload ──
  if (flow === 'upload') {
    const handleBulkFiles = (items) => {
      setBulkItems(items.map((i) => ({ ...i, contentText: '' })))
    }

    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5 pb-20 md:pb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setFlow(null)} className="text-sm text-[#6B6358] min-h-[44px] flex items-center">
            ← Back
          </button>
          <span className="text-sm text-[#A89E93]">/</span>
          <h1 className="text-lg font-semibold text-[#1A1612]">Upload Image</h1>
        </div>

        {/* Bulk toggle */}
        <div className="flex items-center justify-between bg-white border border-[#E8E2D9] rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[#1A1612]">Upload multiple</p>
            <p className="text-xs text-[#A89E93]">Upload up to 20 images at once</p>
          </div>
          <button
            type="button"
            onClick={() => { setBulkMode(!bulkMode); setBulkItems([]); setImageFile(null); setUploadedPreviewUrl(null) }}
            className={`w-12 h-6 rounded-full transition-all relative shrink-0 min-w-[48px] min-h-[48px] flex items-center justify-center ${bulkMode ? 'bg-[#FF6B00]' : 'bg-[#E8E2D9]'}`}
          >
            <div className={`absolute w-5 h-5 rounded-full bg-white shadow transition-all ${bulkMode ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {bulkMode ? (
          <div className="space-y-4">
            <ImageUploader
              value={null}
              onChange={() => {}}
              multiple
              onMultiple={handleBulkFiles}
            />
            {bulkItems.length > 0 && (
              <>
                <p className="text-xs text-[#6B6358] font-medium">{bulkItems.length} of 20 slots used</p>
                <div className="grid grid-cols-3 gap-2">
                  {bulkItems.map((item, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden border border-[#E8E2D9]">
                      <div className="aspect-[9/16]">
                        <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setBulkItems(bulkItems.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={proceedToMetadata}
                  className="w-full py-4 rounded-xl text-white font-semibold text-base flex items-center justify-center gap-2 min-h-[56px]"
                  style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
                >
                  Continue with {bulkItems.length} images <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <ImageUploader
              value={imageFile}
              onChange={(file) => {
                setImageFile(file)
                if (uploadedPreviewUrl) URL.revokeObjectURL(uploadedPreviewUrl)
                setUploadedPreviewUrl(file ? URL.createObjectURL(file) : null)
              }}
            />
            <button
              onClick={proceedToMetadata}
              disabled={!imageFile}
              className="w-full py-4 rounded-xl text-white font-semibold text-base disabled:opacity-40 flex items-center justify-center gap-2 min-h-[56px]"
              style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
            >
              Continue to Details <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>
    )
  }

  // ── STEP 1, Flow B: Build on Background ──
  if (flow === 'build') {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-20 md:pb-6">
        {showAIModal && (
          <AIGenerateModal
            onClose={() => setShowAIModal(false)}
            onUse={handleAIBackground}
          />
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setFlow(null)} className="text-sm text-[#6B6358] min-h-[44px] flex items-center">
              ← Back
            </button>
            <span className="text-sm text-[#A89E93]">/</span>
            <h1 className="text-lg font-semibold text-[#1A1612]">Build on Background</h1>
          </div>
          <button
            onClick={() => setShowAIModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-medium min-h-[44px]"
            style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
          >
            <Sparkles size={14} /> AI Generate
          </button>
        </div>

        <div className="flex flex-col md:grid md:grid-cols-[1fr_300px] gap-5">
          {/* Left: Background picker */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setBgCategoryId('')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${!bgCategoryId ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white border-[#E8E2D9] text-[#6B6358]'}`}
              >
                All
              </button>
              {categories?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setBgCategoryId(c.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${bgCategoryId === c.id ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white border-[#E8E2D9] text-[#6B6358]'}`}
                >
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] md:max-h-[520px] overflow-y-auto pr-1">
              {backgrounds?.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setSelectedBg(bg)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                    selectedBg?.id === bg.id ? 'border-[#FF6B00] ring-2 ring-[#FF6B00]/30' : 'border-transparent hover:border-[#FF6B00]/40'
                  }`}
                >
                  <div className="aspect-[9/16]">
                    <img src={getBgUrl(bg.image_url)} alt={bg.name} className="w-full h-full object-cover" />
                  </div>
                  {selectedBg?.id === bg.id && (
                    <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#FF6B00] flex items-center justify-center">
                      <Check size={13} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
              {!backgrounds?.length && (
                <div className="col-span-2 md:col-span-3 py-10 text-center text-[#A89E93] text-sm">
                  No backgrounds. Upload some in Backgrounds, or use AI Generate above.
                </div>
              )}
            </div>
          </div>

          {/* Right: Text editor + preview */}
          <div className="space-y-4">
            <CardPreview
              ref={previewRef}
              backgroundUrl={selectedBg
                ? selectedBg.image_url?.startsWith('http')
                  ? selectedBg.image_url
                  : getBgUrl(selectedBg.image_url)
                : null}
              overlayText={overlayText}
              fontSize={fontSize}
              fontColor={fontColor}
              textPosition={textPosition}
              bold={bold}
              shadow={shadow}
            />

            <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 space-y-4">
              <textarea
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                rows={3}
                className="w-full px-3 py-3 rounded-xl border border-[#E8E2D9] text-sm focus:outline-none focus:border-[#FF6B00] resize-none"
                placeholder="Enter your text…"
              />

              {/* Font size pills */}
              <div>
                <label className="text-xs font-medium text-[#6B6358] uppercase tracking-wider mb-2 block">Size</label>
                <div className="flex gap-2">
                  {FONT_SIZES.map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFontSize(value)}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all min-h-[48px] ${
                        fontSize === value ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white border-[#E8E2D9] text-[#6B6358]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color swatches */}
              <div>
                <label className="text-xs font-medium text-[#6B6358] uppercase tracking-wider mb-2 block">Color</label>
                <div className="flex gap-3">
                  {TEXT_COLORS.map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFontColor(value)}
                      title={label}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${fontColor === value ? 'border-[#FF6B00] scale-110' : 'border-[#E8E2D9]'}`}
                      style={{ background: value }}
                    />
                  ))}
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="text-xs font-medium text-[#6B6358] uppercase tracking-wider mb-2 block">Position</label>
                <div className="flex gap-2">
                  {['top', 'center', 'bottom'].map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setTextPosition(pos)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium capitalize border-2 transition-all min-h-[48px] ${
                        textPosition === pos ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white border-[#E8E2D9] text-[#6B6358]'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bold / Shadow toggles */}
              <div className="flex gap-4">
                {[
                  { label: 'Bold', state: bold, set: setBold },
                  { label: 'Shadow', state: shadow, set: setShadow },
                ].map(({ label, state, set }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => set(!state)}
                    className="flex items-center gap-2 min-h-[48px]"
                  >
                    <div className={`w-12 h-6 rounded-full relative transition-all ${state ? 'bg-[#FF6B00]' : 'bg-[#E8E2D9]'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${state ? 'left-6' : 'left-0.5'}`} />
                    </div>
                    <span className="text-sm text-[#6B6358]">{label}</span>
                  </button>
                ))}
              </div>

              {generatedPreviewUrl ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    className="w-full py-3 rounded-xl border border-[#FF6B00] text-[#FF6B00] text-sm font-medium min-h-[48px]"
                  >
                    Regenerate Image
                  </button>
                  <button
                    type="button"
                    onClick={proceedToMetadata}
                    className="w-full py-4 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 min-h-[52px]"
                    style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
                  >
                    Continue to Details <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={!selectedBg || generating}
                  className="w-full py-4 rounded-xl text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 min-h-[52px]"
                  style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
                >
                  {generating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating…
                    </>
                  ) : (
                    'Generate Image →'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
