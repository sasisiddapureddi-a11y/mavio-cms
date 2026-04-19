import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react'

const CANVAS_W = 1080
const CANVAS_H = 1920
const PREVIEW_W = 270
const PREVIEW_H = 480

const CardPreview = forwardRef(function CardPreview(
  {
    backgroundUrl,
    overlayText = '',
    fontSize = 32,
    fontColor = '#FFFFFF',
    textPosition = 'center',
    bold = false,
    shadow = true,
  },
  ref
) {
  const canvasRef = useRef(null)
  const [rendering, setRendering] = useState(false)

  const drawCanvas = async (canvas) => {
    if (!canvas || !backgroundUrl) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    await new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H)
        resolve()
      }
      img.onerror = () => {
        ctx.fillStyle = '#1A1612'
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
        resolve()
      }
      img.src = backgroundUrl
    })

    if (overlayText) {
      const weight = bold ? 'bold' : 'normal'
      const px = Math.round(fontSize * (CANVAS_W / PREVIEW_W))
      ctx.font = `${weight} ${px}px Geist, sans-serif`
      ctx.fillStyle = fontColor
      ctx.textAlign = 'center'

      if (shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.7)'
        ctx.shadowBlur = 16
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
      } else {
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }

      const maxWidth = CANVAS_W * 0.85
      const lineHeight = px * 1.4
      const words = overlayText.split(' ')
      const lines = []
      let currentLine = ''

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        if (ctx.measureText(testLine).width > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) lines.push(currentLine)

      const totalHeight = lines.length * lineHeight
      let startY
      if (textPosition === 'top') {
        startY = px + 120
      } else if (textPosition === 'bottom') {
        startY = CANVAS_H - totalHeight - 120
      } else {
        startY = (CANVAS_H - totalHeight) / 2 + px / 2
      }

      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], CANVAS_W / 2, startY + i * lineHeight, maxWidth)
      }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawCanvas(canvas)
  }, [backgroundUrl, overlayText, fontSize, fontColor, textPosition, bold, shadow])

  useImperativeHandle(ref, () => ({
    generateImage: () =>
      new Promise(async (resolve, reject) => {
        setRendering(true)
        try {
          const canvas = document.createElement('canvas')
          canvas.width = CANVAS_W
          canvas.height = CANVAS_H
          await drawCanvas(canvas)
          canvas.toBlob(
            (blob) => {
              setRendering(false)
              if (blob) resolve(blob)
              else reject(new Error('Failed to generate image'))
            },
            'image/jpeg',
            0.92
          )
        } catch (err) {
          setRendering(false)
          reject(err)
        }
      }),
  }))

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative rounded-xl overflow-hidden border border-[#E8E2D9] shadow-md bg-[#1A1612]"
        style={{ width: PREVIEW_W, height: PREVIEW_H }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ width: PREVIEW_W, height: PREVIEW_H, display: 'block' }}
        />
        {rendering && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <p className="text-xs text-[#A89E93]">Live preview — final export 1080×1920</p>
    </div>
  )
})

export default CardPreview
