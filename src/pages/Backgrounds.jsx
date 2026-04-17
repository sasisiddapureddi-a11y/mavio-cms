import { useState } from 'react'
import { Trash2, Upload } from 'lucide-react'
import { useBackgrounds, useUploadBackground, useDeleteBackground } from '../hooks/useBackgrounds'
import { useCategories } from '../hooks/useCategories'
import { getBgUrl } from '../lib/supabase'
import ImageUploader from '../components/ImageUploader'

export default function Backgrounds() {
  const [categoryFilter, setCategoryFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadCategory, setUploadCategory] = useState('')

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
    await deleteBg.mutateAsync({ id: deleteTarget.id, imagePath: deleteTarget.image_url })
    setDeleteTarget(null)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1A1612]" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Background Templates
        </h1>
        <p className="text-sm text-[#6B6358]">{backgrounds?.length ?? 0} templates</p>
      </div>

      {/* Upload section */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-[#1A1612] flex items-center gap-2">
          <Upload size={16} className="text-[#FF6B00]" />
          Upload New Background
        </h2>
        <ImageUploader value={uploadFile} onChange={setUploadFile} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#6B6358] mb-1 uppercase tracking-wider">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="e.g. Sunrise gradient"
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1612] focus:outline-none focus:border-[#FF6B00]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B6358] mb-1 uppercase tracking-wider">Category</label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1612] focus:outline-none focus:border-[#FF6B00] bg-white"
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
          className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
        >
          {uploadBg.isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload size={15} />
              Upload Background
            </>
          )}
        </button>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${!categoryFilter ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white border-[#E8E2D9] text-[#6B6358] hover:border-[#FF6B00]/50'}`}
        >
          All
        </button>
        {categories?.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryFilter(c.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${categoryFilter === c.id ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white border-[#E8E2D9] text-[#6B6358] hover:border-[#FF6B00]/50'}`}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-[#E8E2D9] animate-pulse" />
          ))}
        </div>
      ) : !backgrounds?.length ? (
        <div className="py-16 text-center bg-white border border-[#E8E2D9] rounded-2xl">
          <div className="text-4xl mb-3">🖼️</div>
          <p className="font-medium text-[#1A1612]">No backgrounds yet</p>
          <p className="text-sm text-[#A89E93] mt-1">Upload your first background template above</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {backgrounds.map((bg) => (
            <div key={bg.id} className="group relative rounded-2xl overflow-hidden border border-[#E8E2D9] bg-[#F5F3EF]">
              <div className="aspect-square">
                <img
                  src={getBgUrl(bg.image_url)}
                  alt={bg.name}
                  className="w-full h-full object-cover"
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
                className="absolute top-2 right-2 p-1.5 bg-white rounded-lg shadow-sm border border-[#E8E2D9] opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:border-red-200 transition-all"
              >
                <Trash2 size={14} className="text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-[#E8E2D9]">
            <h3 className="font-semibold text-[#1A1612] mb-2">Delete Background?</h3>
            <p className="text-sm text-[#6B6358] mb-5">
              This will permanently delete "{deleteTarget.name}" and remove it from storage.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-[#E8E2D9] text-sm font-medium text-[#6B6358] hover:bg-[#F5F3EF]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteBg.isPending}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-60"
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
