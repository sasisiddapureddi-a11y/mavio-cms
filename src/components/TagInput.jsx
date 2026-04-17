import { useState } from 'react'
import { X } from 'lucide-react'

export default function TagInput({ tags = [], onAdd, onRemove, placeholder }) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = input.trim().replace(/,$/, '')
      if (tag && !tags.includes(tag)) {
        onAdd(tag)
      }
      setInput('')
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onRemove(tags[tags.length - 1])
    }
  }

  return (
    <div
      className="min-h-[44px] flex flex-wrap gap-1.5 items-center px-3 py-2 rounded-xl border border-[#E8E2D9] bg-white focus-within:border-[#FF6B00] focus-within:ring-2 focus-within:ring-[#FF6B00]/20 transition-all"
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFF0E6] text-[#FF6B00] border border-[#FF6B00]/20"
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="hover:text-red-500 transition-colors"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 min-w-[120px] outline-none text-sm text-[#1A1612] placeholder:text-[#A89E93] bg-transparent"
        placeholder={tags.length === 0 ? (placeholder || 'Type tag, press Enter... e.g. pawan kalyan, love failure') : ''}
      />
    </div>
  )
}
