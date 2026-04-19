import { useState } from 'react'
import { X, Sparkles, RefreshCw } from 'lucide-react'

const STYLES = ['Gradient', 'Nature', 'Abstract', 'Texture']

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
      let imagePrompt = `${style.toLowerCase()} background for Telugu content app card, ${description}, 9:16 portrait, vibrant, suitable for text overlay`

      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
      if (apiKey) {
        try {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-opus-4-20250514',
              max_tokens: 200,
              messages: [{
                role: 'user',
                content: `Create a detailed image generation prompt for a ${style.toLowerCase()} background for a Telugu content app card. Description: ${description}. The background must be 9:16 portrait ratio, visually striking, suitable for text overlay. Return only the prompt, nothing else.`,
              }],
            }),
          })
          if (res.ok) {
            const data = await res.json()
            imagePrompt = data.content?.[0]?.text || imagePrompt
          }
        } catch {
          // fall through with default prompt
        }
      }

      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1080&height=1920&nologo=true&seed=${Date.now()}`
      setGeneratedUrl(url)
    } catch (err) {
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
            placeholder='e.g. "orange sunset sky motivational gradient"'
            className="w-full px-3 py-3 rounded-xl border border-[#E8E2D9] text-sm focus:outline-none focus:border-[#FF6B00] resize-none"
            style={{ minHeight: 80 }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B6358] uppercase tracking-wider mb-1.5">
            Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                className={`py-3 rounded-xl text-sm font-medium border-2 transition-all min-h-[48px] ${
                  style === s
                    ? 'border-[#FF6B00] bg-[#FFF0E6] text-[#FF6B00]'
                    : 'border-[#E8E2D9] text-[#6B6358]'
                }`}
              >
                {s}
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

        {(imageError) && (
          <p className="text-sm text-red-500">Image failed to load. Try generating again.</p>
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
