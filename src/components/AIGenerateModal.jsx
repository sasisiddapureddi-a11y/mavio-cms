import { useState } from 'react'
import { X, Sparkles, RefreshCw } from 'lucide-react'

const STYLES = [
  { label: 'Gradient', prompt: 'smooth vibrant gradient background with warm saffron orange and gold tones' },
  { label: 'Nature', prompt: 'beautiful serene nature landscape with soft bokeh, sunrise or sunset lighting' },
  { label: 'Abstract', prompt: 'modern abstract geometric art with bold colors and smooth shapes' },
  { label: 'Texture', prompt: 'elegant textured surface with subtle patterns, marble or silk look' },
]

function buildPrompt(style, description) {
  const stylePrompt = STYLES.find(s => s.label === style)?.prompt || style.toLowerCase()
  return `${stylePrompt}, ${description.trim()}, portrait orientation 9:16 ratio, suitable for text overlay, no text, high quality digital art`
}

export default function AIGenerateModal({ onClose, onUse }) {
  const [description, setDescription] = useState('')
  const [style, setStyle] = useState('Gradient')
  const [generating, setGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState(null)
  const [imageError, setImageError] = useState(false)
  const [error, setError] = useState(null)

  const generate = async () => {
    if (!description.trim()) return
    setGenerating(true)
    setError(null)
    setGeneratedUrl(null)
    setImageError(false)

    try {
      const prompt = buildPrompt(style, description)
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1920&nologo=true&seed=${Date.now()}`
      setGeneratedUrl(url)
    } catch {
      setError('Generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-md p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#1A1612] flex items-center gap-2 text-base">
            <Sparkles size={18} className="text-[#FF6B00]" />
            Generate Background with AI
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#F5F3EF] min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B6358] uppercase tracking-wider mb-1.5">
            Describe the background
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder='e.g. "orange sunset sky with golden light"'
            className="w-full px-3 py-3 rounded-xl border border-[#E8E2D9] text-sm focus:outline-none focus:border-[#FF6B00] resize-none"
            style={{ minHeight: 80 }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B6358] uppercase tracking-wider mb-1.5">
            Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map(({ label }) => (
              <button
                key={label}
                type="button"
                onClick={() => setStyle(label)}
                className={`py-3 rounded-xl text-sm font-medium border-2 transition-all min-h-[48px] ${
                  style === label
                    ? 'border-[#FF6B00] bg-[#FFF0E6] text-[#FF6B00]'
                    : 'border-[#E8E2D9] text-[#6B6358]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {generatedUrl && !imageError && (
          <div className="space-y-3">
            <div className="aspect-[9/16] rounded-xl overflow-hidden bg-[#F5F3EF] max-h-64">
              <img
                src={generatedUrl}
                alt="Generated background"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="flex-1 py-3 rounded-xl border-2 border-[#FF6B00] text-[#FF6B00] text-sm font-medium flex items-center justify-center gap-2 min-h-[48px]"
              >
                <RefreshCw size={15} />
                Generate Another
              </button>
              <button
                type="button"
                onClick={() => onUse(generatedUrl)}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold min-h-[48px]"
                style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
              >
                Use This
              </button>
            </div>
          </div>
        )}

        {imageError && (
          <div className="space-y-2">
            <p className="text-sm text-red-500">Image failed to load. Try generating again.</p>
            <button
              type="button"
              onClick={generate}
              className="w-full py-3 rounded-xl border border-[#E8E2D9] text-sm text-[#6B6358] min-h-[48px]"
            >
              Try Again
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {!generatedUrl && (
          <button
            type="button"
            onClick={generate}
            disabled={!description.trim() || generating}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2 min-h-[52px]"
            style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
          >
            {generating ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate →
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
