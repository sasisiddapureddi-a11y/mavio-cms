import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

export default function ImageUploader({ value, onChange, label = 'Upload Image' }) {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)

  const validateImage = (file) =>
    new Promise((resolve, reject) => {
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        return reject('Only JPG and PNG files are allowed.')
      }
      if (file.size > 10 * 1024 * 1024) {
        return reject('File must be under 10MB.')
      }
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        if (img.width < 500 || img.height < 500) {
          return reject('Image must be at least 500×500 pixels.')
        }
        resolve()
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject('Could not read image file.')
      }
      img.src = url
    })

  const onDrop = useCallback(async (acceptedFiles) => {
    setError(null)
    const file = acceptedFiles[0]
    if (!file) return

    try {
      await validateImage(file)
      const objectUrl = URL.createObjectURL(file)
      setPreview(objectUrl)
      onChange(file)
    } catch (err) {
      setError(err)
    }
  }, [onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [] },
    maxFiles: 1,
    multiple: false,
  })

  const remove = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    onChange(null)
  }

  const displayUrl = preview || (typeof value === 'string' ? value : null)

  if (displayUrl) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-[#E8E2D9] bg-[#F5F3EF]">
        <img
          src={displayUrl}
          alt="Preview"
          className="w-full h-64 object-cover"
        />
        <button
          type="button"
          onClick={remove}
          className="absolute top-2 right-2 p-1.5 bg-white rounded-lg shadow-sm border border-[#E8E2D9] hover:bg-red-50 hover:border-red-200 transition-all"
        >
          <X size={16} className="text-[#6B6358] hover:text-red-500" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`
          relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all
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
            {isDragActive ? 'Drop it here' : `Drop image or click to browse`}
          </p>
          <p className="text-xs text-[#A89E93] mt-1">JPG, PNG • min 500×500px • max 10MB</p>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
