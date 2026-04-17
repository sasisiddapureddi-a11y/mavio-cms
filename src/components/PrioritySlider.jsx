export default function PrioritySlider({ value = 5, onChange }) {
  const pct = ((value - 1) / 9) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#6B6358]">Priority</span>
        <span
          className="text-sm font-semibold px-2.5 py-0.5 rounded-full"
          style={{
            background: value >= 7 ? '#FFF0E6' : value >= 4 ? '#FEF9C3' : '#F5F3EF',
            color: value >= 7 ? '#FF6B00' : value >= 4 ? '#CA8A04' : '#6B6358',
          }}
        >
          {value} / 10
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #FF6B00 0%, #FFB800 ${pct}%, #E8E2D9 ${pct}%)`,
        }}
      />
      <p className="text-xs text-[#A89E93]">1 = low priority, 10 = festival/hero content</p>
    </div>
  )
}
