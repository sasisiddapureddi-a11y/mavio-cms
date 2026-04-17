import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Upload, Layers, Check, ChevronRight } from 'lucide-react'

import { useCreateCard } from '../hooks/useCards'
import { useCategories } from '../hooks/useCategories'
import { useLanguages } from '../hooks/useLanguages'
import { useFestivals } from '../hooks/useFestivals'
import { useBackgrounds } from '../hooks/useBackgrounds'
import { getBgUrl } from '../lib/supabase'
import ImageUploader from '../components/ImageUploader'
import CardPreview from '../components/CardPreview'
import TagInput from '../components/TagInput'
import PrioritySlider from '../components/PrioritySlider'

const OCCASIONS = [
  'Good Morning', 'Good Night', 'Birthday', 'Anniversary', 'Wedding',
  'Festival', 'Motivation', 'Love', 'Breakup', 'Friendship', 'Success', 'General',
]

const TEXT_COLORS = [
  { label: 'White', value: '#FFFFFF' },
  { label: 'Black', value: '#000000' },
  { label: 'Gold', value: '#FFB800' },
  { label: 'Saffron', value: '#FF6B00' },
  { label: 'Cream', value: '#F8FAFC' },
]

export default function CardNew() {
  const [searchParams] = useSearchParams()
  const presetFestival = searchParams.get('festival')
  const navigate = useNavigate()
  const createCard = useCreateCard()
  const previewRef = useRef(null)

  const { data: categories } = useCategories()
  const { data: languages } = useLanguages()
  const { data: festivals } = useFestivals()

  // Step & flow state
  const [step, setStep] = useState(1)
  const [flow, setFlow] = useState(null) // 'upload' | 'build'
  const [imageFile, setImageFile] = useState(null)
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState(null)

  // Build-on-background state
  const [bgCategoryId, setBgCategoryId] = useState('')
  const [selectedBg, setSelectedBg] = useState(null)
  const [overlayText, setOverlayText] = useState('')
  const [fontSize, setFontSize] = useState(32)
  const [fontColor, setFontColor] = useState('#FFFFFF')
  const [textPosition, setTextPosition] = useState('center')
  const [bold, setBold] = useState(false)
  const [shadow, setShadow] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatedPreviewUrl, setGeneratedPreviewUrl] = useState(null)
  const [generatedBlob, setGeneratedBlob] = useState(null)

  const { data: backgrounds } = useBackgrounds(bgCategoryId || undefined)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      category_id: '',
      language_id: '',
      occasions: [],
      festival_id: presetFestival || '',
      tags: [],
      priority: 5,
      status: 'draft',
      scheduled_at: '',
    },
  })

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
      toast.success('Image generated!')
    } catch (err) {
      toast.error('Failed to generate image')
    } finally {
      setGenerating(false)
    }
  }

  const proceedToMetadata = () => {
    if (flow === 'upload' && !imageFile) {
      toast.error('Please upload an image first')
      return
    }
    if (flow === 'build' && !generatedBlob) {
      toast.error('Please generate the image first')
      return
    }
    setStep(2)
  }

  const onSubmit = async (data) => {
    if (!imageFile) {
      toast.error('Image is required')
      return
    }
    try {
      await createCard.mutateAsync({
        file: imageFile,
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
      // error toast is handled in the hook
    }
  }

  // Step 1 — Method selection
  if (step === 1 && !flow) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-[#1A1612] mb-2" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Create New Card
        </h1>
        <p className="text-sm text-[#6B6358] mb-8">Choose how you want to create this content card.</p>
        <div className="grid grid-cols-2 gap-5">
          {[
            {
              key: 'upload',
              icon: Upload,
              title: 'Upload Your Image',
              desc: 'Upload a finished image from your device — JPG or PNG, min 500×500px.',
            },
            {
              key: 'build',
              icon: Layers,
              title: 'Build on Background',
              desc: 'Pick a background template from the library and add your text overlay.',
            },
          ].map(({ key, icon: Icon, title, desc }) => (
            <button
              key={key}
              onClick={() => setFlow(key)}
              className="flex flex-col items-start gap-4 p-6 bg-white border-2 border-[#E8E2D9] rounded-2xl hover:border-[#FF6B00]/40 hover:shadow-md transition-all text-left group"
            >
              <div className="p-3 rounded-xl bg-[#FFF0E6] text-[#FF6B00] group-hover:scale-105 transition-transform">
                <Icon size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-[#1A1612]">{title}</h3>
                <p className="text-sm text-[#6B6358] mt-1">{desc}</p>
              </div>
              <ChevronRight size={18} className="text-[#A89E93] self-end group-hover:text-[#FF6B00] transition-colors" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Step 1 — Upload flow
  if (step === 1 && flow === 'upload') {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setFlow(null)} className="text-sm text-[#6B6358] hover:text-[#1A1612]">← Back</button>
          <span className="text-sm text-[#A89E93]">/</span>
          <h1 className="text-lg font-semibold text-[#1A1612]">Upload Image</h1>
        </div>
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
          className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
        >
          Continue to Metadata <ChevronRight size={16} />
        </button>
      </div>
    )
  }

  // Step 1 — Build flow
  if (step === 1 && flow === 'build') {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center gap-2">
          <button onClick={() => setFlow(null)} className="text-sm text-[#6B6358] hover:text-[#1A1612]">← Back</button>
          <span className="text-sm text-[#A89E93]">/</span>
          <h1 className="text-lg font-semibold text-[#1A1612]">Build on Background</h1>
        </div>

        <div className="grid grid-cols-[1fr_420px] gap-6">
          {/* Left: background picker */}
          <div className="space-y-4">
            {/* Category filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setBgCategoryId('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${!bgCategoryId ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white border-[#E8E2D9] text-[#6B6358] hover:border-[#FF6B00]/50'}`}
              >
                All
              </button>
              {categories?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setBgCategoryId(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${bgCategoryId === c.id ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white border-[#E8E2D9] text-[#6B6358] hover:border-[#FF6B00]/50'}`}
                >
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>

            {/* Background grid */}
            <div className="grid grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {backgrounds?.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setSelectedBg(bg)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedBg?.id === bg.id ? 'border-[#FF6B00] ring-2 ring-[#FF6B00]/30' : 'border-transparent hover:border-[#FF6B00]/40'
                  }`}
                >
                  <img src={getBgUrl(bg.image_url)} alt={bg.name} className="w-full h-full object-cover" />
                  {selectedBg?.id === bg.id && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#FF6B00] flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
              {!backgrounds?.length && (
                <div className="col-span-3 py-10 text-center text-[#A89E93] text-sm">
                  No backgrounds found. Upload some in the Backgrounds section.
                </div>
              )}
            </div>
          </div>

          {/* Right: text editor + preview */}
          <div className="space-y-4">
            <CardPreview
              ref={previewRef}
              backgroundUrl={selectedBg ? getBgUrl(selectedBg.image_url) : null}
              overlayText={overlayText}
              fontSize={fontSize}
              fontColor={fontColor}
              textPosition={textPosition}
              bold={bold}
              shadow={shadow}
            />

            <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-[#6B6358] uppercase tracking-wider">Quote / Text</label>
                <textarea
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1612] focus:outline-none focus:border-[#FF6B00] resize-none"
                  placeholder="Enter your text…"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#6B6358] uppercase tracking-wider">Font Size: {fontSize}px</label>
                <input
                  type="range"
                  min={16}
                  max={56}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#6B6358] uppercase tracking-wider mb-2 block">Color</label>
                <div className="flex gap-2">
                  {TEXT_COLORS.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => setFontColor(value)}
                      title={label}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${fontColor === value ? 'border-[#FF6B00] scale-110' : 'border-[#E8E2D9]'}`}
                      style={{ background: value }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#6B6358] uppercase tracking-wider mb-2 block">Position</label>
                <div className="flex gap-2">
                  {['top', 'center', 'bottom'].map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setTextPosition(pos)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${
                        textPosition === pos ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white border-[#E8E2D9] text-[#6B6358]'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setBold(!bold)}
                    className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${bold ? 'bg-[#FF6B00]' : 'bg-[#E8E2D9]'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${bold ? 'left-5' : 'left-0.5'}`} />
                  </div>
                  <span className="text-xs text-[#6B6358]">Bold</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setShadow(!shadow)}
                    className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${shadow ? 'bg-[#FF6B00]' : 'bg-[#E8E2D9]'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${shadow ? 'left-5' : 'left-0.5'}`} />
                  </div>
                  <span className="text-xs text-[#6B6358]">Shadow</span>
                </label>
              </div>

              {generatedPreviewUrl ? (
                <div className="space-y-2">
                  <img src={generatedPreviewUrl} alt="Generated" className="w-full rounded-xl border border-[#E8E2D9]" />
                  <button
                    onClick={handleGenerateImage}
                    className="w-full py-2 rounded-xl border border-[#FF6B00] text-[#FF6B00] text-sm font-medium hover:bg-[#FFF0E6]"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={proceedToMetadata}
                    className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
                  >
                    Continue to Metadata <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGenerateImage}
                  disabled={!selectedBg || generating}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
                >
                  {generating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating…
                    </>
                  ) : (
                    'Generate Final Image'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 2 — Metadata form
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => setStep(1)} className="text-sm text-[#6B6358] hover:text-[#1A1612]">← Back</button>
        <span className="text-sm text-[#A89E93]">/</span>
        <h1 className="text-lg font-semibold text-[#1A1612]">Card Details</h1>
      </div>

      {/* Image preview */}
      {imageFile && (
        <div className="rounded-xl overflow-hidden border border-[#E8E2D9] h-48">
          <img
            src={generatedPreviewUrl || uploadedPreviewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}

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

        {/* Festival Link (conditional) */}
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

        {/* Schedule datetime */}
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
          disabled={isSubmitting || createCard.isPending}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
        >
          {isSubmitting || createCard.isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            'Save Card'
          )}
        </button>
      </form>
    </div>
  )
}
