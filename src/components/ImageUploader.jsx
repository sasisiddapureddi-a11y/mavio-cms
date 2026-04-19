import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Image as ImageIcon, Crop } from 'lucide-react'

const MIN_W = 607
const MIN_H = 1080
const TARGET_RATIO = 9 / 16
const RATIO_TOLERANCE = 0.05

function is916(w, h) {
  return Math.abs(w / h - TARGET_RATIO) <= RATIO_TOLERANCE
}

async function cropTo916(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const sourceRatio = img.width / img.height
      let sx, sy, sw, sh
      if (sourceRatio > TARGET_RATIO) {
        sh = img.height
        sw = img.height * TARGET_RATIO
        sx = (img.width - sw) / 2
        sy = 0
      } else {
        sw = img.width
        sh = img.width / TARGET_RATIO
        sx = 0
        sy = (img.height - sh) / 2
      }
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(sw)
      canvas.height = Math.round(sh)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.92)
    }
    img.src = url
  })
}

export default function ImageUploader({ value, onChange, label = 'Upload Image', multiple = false, onMultiple }) {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [ratioWarning, setRatioWarning] = useState(null) // { file, w, h, previewUrl }

  const validateAndProcess = async (file) => {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      return { error: 'Only JPG, PNG, and WebP files are allowed.' }
    }
    if (file.size > 20 * 1024 * 1024) {
      return { error: 'File must be under 20MB.' }
    }
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        if (img.width < MIN_W || img.height < MIN_H) {
          resolve({ error: `Image must be at least ${MIN_W}×${MIN_H}px (9:16 minimum).` })
        } else {
          resolve({ ok: true, w: img.width, h: img.height })
        }
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve({ error: 'Could not read image file.' }) }
      img.src = url
    })
  }

  const onDrop = useCallback(async (acceptedFiles) => {
    setError(null)
    if (!acceptedFiles.length) return

    if (multiple && onMultiple) {
      const results = []
      for (const file of acceptedFiles.slice(0, 20)) {
        const res = await validateAndProcess(file)
        if (res.error) continue
        results.push({ file, previewUrl: URL.createObjectURL(file), w: res.w, h: res.h })
      }
      onMultiple(results)
      return
    }

    const file = acceptedFiles[0]
    const res = await validateAndProcess(file)
    if (res.error) { setError(res.error); return }

    if (!is916(res.w, res.h)) {
      setRatioWarning({ file, w: res.w, h: res.h, previewUrl: URL.createObjectURL(file) })
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)
    onChange(file)
  }, [onChange, multiple, onMultiple])

  const handleCrop = async () => {
    if (!ratioWarning) return
    const cropped = await cropTo916(ratioWarning.file)
    URL.revokeObjectURL(ratioWarning.previewUrl)
    const previewUrl = URL.createObjectURL(cropped)
    setPreview(previewUrl)
    setRatioWarning(null)
    onChange(cropped)
  }

  const handleUseAnyway = () => {
    if (!ratioWarning) return
    setPreview(ratioWarning.previewUrl)
    onChange(ratioWarning.file)
    setRatioWarning(null)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxFiles: multiple ? 20 : 1,
    multiple,
  })

  const remove = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    onChange(null)
  }

  const displayUrl = preview || (typeof value === 'string' ? value : null)

  // Ratio warning modal
  if (ratioWarning) {
    return (
      <div className="space-y-3">
        <div className="relative rounded-xl overflow-hidden border border-yellow-300 bg-yellow-50">
          <div className="aspect-[9/16] max-w-[180px] mx-auto overflow-hidden">
            <img src={ratioWarning.previewUrl} alt="Preview" className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-200">
          <p className="text-sm font-medium text-yellow-800">Image is not 9:16 ratio</p>
          <p className="text-xs text-yellow-700 mt-0.5">
            Your image is {ratioWarning.w}×{ratioWarning.h}px. Cards display best in 9:16 portrait format.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCrop}
            className="flex-1 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
          >
            <Crop size={15} /> Crop to 9:16
          </button>
          <button
            type="button"
            onClick={handleUseAnyway}
            className="flex-1 py-3 rounded-xl border border-[#E8E2D9] text-[#6B6358] text-sm font-medium"
          >
            Use Anyway
          </button>
        </div>
      </div>
    )
  }

  if (displayUrl) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-[#E8E2D9] bg-[#F5F3EF]">
        <div className="aspect-[9/16] max-w-[270px] mx-auto overflow-hidden">
          <img src={displayUrl} alt="Preview" className="w-full h-full object-cover" />
        </div>
        <button
          type="button"
          onClick={remove}
          className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-sm border border-[#E8E2D9] hover:bg-red-50 hover:border-red-200 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X size={16} className="text-[#6B6358]" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`
          relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all min-h-[120px]
          ${isDragActive
            ? 'border-[#FF6B00] bg-[#FFF0E6]'
            : 'border-[#E8E2D9] bg-[#F5F3EF] hover:border-[#FF6B00]/50 hover:bg-[#FFF0E6]/50'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className={`p-3 rounded-full ${isDragActive ? 'bg-[#FF6B00]/10' : 'bg-white border border-[#E8E2D9]'}`}>
          {isDragActive ? (
            <Upload size={24} className="text-[#FF6B00]" />
          ) : (
            <ImageIcon size={24} className="text-[#A89E93]" />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[#1A1612]">
            {isDragActive ? 'Drop here' : 'Tap to upload or drag image'}
          </p>
          <p className="text-xs text-[#A89E93] mt-1">JPG, PNG, WebP · 9:16 ratio · max 20MB</p>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
