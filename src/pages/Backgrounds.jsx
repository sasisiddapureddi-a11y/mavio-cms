import { useState } from 'react'
import { Trash2, Upload, Sparkles } from 'lucide-react'
import { useBackgrounds, useUploadBackground, useDeleteBackground } from '../hooks/useBackgrounds'
import { useCategories } from '../hooks/useCategories'
import { getBgUrl } from '../lib/supabase'
import ImageUploader from '../components/ImageUploader'
import AIGenerateModal from '../components/AIGenerateModal'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Backgrounds() {
  const [categoryFilter, setCategoryFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadCategory, setUploadCategory] = useState('')
  const [showAIModal, setShowAIModal] = useState(false)
  const [savingAI, setSavingAI] = useState(false)

  const { data: backgrounds, isLoading } = useBackgrounds(categoryFilter || undefined)
  const { data: categories } = useCategories()
  const uploadBg = useUploadBackground()
  const deleteBg = useDeleteBackground()

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) return
    await uploadBg.mutateAsync({
      file: uploadFile,
      name: uploadName.trim(),
      categoryId: uploadCategory || null,
    })
    setUploadFile(null)
    setUploadName('')
    setUploadCategory('')
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    if (!window.confirm(`Delete "${deleteTarget.name}"? This cannot be undone.`)) {
      setDeleteTarget(null)
      return
    }
    await deleteBg.mutateAsync({ id: deleteTarget.id, imagePath: deleteTarget.image_url })
    setDeleteTarget(null)
  }

  const handleAIUse = async (imageUrl) => {
    setSavingAI(true)
    setShowAIModal(false)
    try {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const file = new File([blob], `ai-bg-${Date.now()}.jpg`, { type: 'image/jpeg' })
      await uploadBg.mutateAsync({
        file,
        name: `AI Generated ${new Date().toLocaleTimeString()}`,
        categoryId: uploadCategory || null,
      })
      toast.success('AI background saved!')
    } catch {
      toast.error('Failed to save AI background')
    } finally {
      setSavingAI(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      {showAIModal && (
        <AIGenerateModal onClose={() => setShowAIModal(false)} onUse={handleAIUse} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1612]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Background Templates
          </h1>
          <p className="text-sm text-[#6B6358]">{backgrounds?.length ?? 0} templates</p>
        </div>
        <button
          onClick={() => setShowAIModal(true)}
          disabled={savingAI}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-white text-sm font-semibold min-h-[48px] disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
        >
          {savingAI ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles size={15} />
          )}
          Generate with AI
        </button>
      </div>

      {/* Upload section */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 md:p-5 space-y-4">
        <h2 className="font-semibold text-[#1A1612] flex items-center gap-2">
          <Upload size={16} className="text-[#FF6B00]" />
          Upload New Background
        </h2>
        <ImageUploader value={uploadFile} onChange={setUploadFile} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#6B6358] mb-1 uppercase tracking-wider">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="e.g. Sunrise gradient"
              className="w-full px-3 py-3 rounded-xl border border-[#E8E2D9] text-sm focus:outline-none focus:border-[#FF6B00] min-h-[48px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B6358] mb-1 uppercase tracking-wider">Category</label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-[#E8E2D9] text-sm focus:outline-none focus:border-[#FF6B00] bg-white min-h-[48px]"
            >
              <option value="">No category</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleUpload}
          disabled={!uploadFile || !uploadName.trim() || uploadBg.isPending}
          className="px-5 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-2 min-h-[48px]"
          style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
        >
          {uploadBg.isPending ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Uploading…</>
          ) : (
            <><Upload size={15} />Upload Background</>
          )}
        </button>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${!categoryFilter ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white border-[#E8E2D9] text-[#6B6358]'}`}
        >
          All
        </button>
        {categories?.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryFilter(c.id)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${categoryFilter === c.id ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white border-[#E8E2D9] text-[#6B6358]'}`}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      {/* Grid — 2 columns on mobile, 4 on desktop */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[9/16] rounded-2xl bg-[#E8E2D9] animate-pulse" />
          ))}
        </div>
      ) : !backgrounds?.length ? (
        <div className="py-16 text-center bg-white border border-[#E8E2D9] rounded-2xl">
          <div className="text-4xl mb-3">🖼️</div>
          <p className="font-medium text-[#1A1612]">No backgrounds yet</p>
          <p className="text-sm text-[#A89E93] mt-1">Upload or generate with AI above</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {backgrounds.map((bg) => (
            <div key={bg.id} className="group relative rounded-2xl overflow-hidden border border-[#E8E2D9] bg-[#F5F3EF]">
              <div className="aspect-[9/16]">
                <img
                  src={getBgUrl(bg.image_url)}
                  alt={bg.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-2.5">
                <p className="text-xs font-medium text-[#1A1612] truncate">{bg.name}</p>
                {bg.category && (
                  <p className="text-[10px] text-[#A89E93] mt-0.5">{bg.category.emoji} {bg.category.name}</p>
                )}
              </div>
              <button
                onClick={() => setDeleteTarget(bg)}
                className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-sm border border-[#E8E2D9] opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:border-red-200 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Trash2 size={14} className="text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl md:rounded-2xl p-6 w-full md:max-w-sm shadow-xl">
            <h3 className="font-semibold text-[#1A1612] mb-2">Delete Background?</h3>
            <p className="text-sm text-[#6B6358] mb-5">
              This will permanently delete "{deleteTarget.name}" and remove it from storage.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-3 rounded-xl border border-[#E8E2D9] text-sm font-medium text-[#6B6358] min-h-[52px]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteBg.isPending}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-60 min-h-[52px]"
              >
                {deleteBg.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
