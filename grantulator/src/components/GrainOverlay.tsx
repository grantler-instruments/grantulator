import { useEffect, useRef } from 'react'
import { Box } from '@mui/material'
import type { GrainPoint } from '../stores/app'

interface GrainOverlayProps {
  width: number
  height: number
  grainPoints: GrainPoint[]
  grainSpread: number
  grainSizeSec: number
  numGrains: number
  totalSamples: number
}

/**
 * Overlay on top of the waveform: dims the buffer and highlights grain regions
 * for each touch point [position, position+spread], with vertical dividers.
 */
export function GrainOverlay({
  width,
  height,
  grainPoints,
  grainSpread,
  grainSizeSec,
  numGrains,
  totalSamples,
}: GrainOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width <= 0 || height <= 0) return

    const dpr = window.devicePixelRatio ?? 1
    const w = width * dpr
    const h = height * dpr
    canvas.width = w
    canvas.height = h
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, w, h)

    // Dim the full width
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
    ctx.fillRect(0, 0, w, h)

    const primaryHighlight = 'rgba(216, 156, 174, 0.28)'
    const edgeHighlight = 'rgba(216, 156, 174, 0.45)'

    const points = grainPoints.length > 0 ? grainPoints : [{ position: 0.5, amplitude: 1 }]

    for (const grainPosition of points) {
      const start = Math.max(0, Math.min(1, grainPosition.position))
      const endRaw = grainPosition.position + grainSpread
      const end = Math.max(0, Math.min(1, endRaw))

      const leftEdge = start * w
      const rightEdge = end * w
      ctx.fillStyle = primaryHighlight
      ctx.fillRect(leftEdge, 0, rightEdge - leftEdge, h)

      const n = Math.max(1, Math.min(50, Math.round(numGrains)))
      const step = (end - start) / n

      ctx.strokeStyle = edgeHighlight
      ctx.lineWidth = 1
      for (let i = 1; i < n; i++) {
        const x = (start + i * step) * w
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }

      ctx.strokeStyle = edgeHighlight
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(leftEdge, 0)
      ctx.lineTo(leftEdge, h)
      ctx.moveTo(rightEdge, 0)
      ctx.lineTo(rightEdge, h)
      ctx.stroke()

      if (endRaw > 1 && grainPosition.position < 1) {
        const wrapWidth = (endRaw - 1) * w
        ctx.fillStyle = primaryHighlight
        ctx.fillRect(0, 0, wrapWidth, h)
        ctx.strokeStyle = edgeHighlight
        ctx.beginPath()
        ctx.moveTo(wrapWidth, 0)
        ctx.lineTo(wrapWidth, h)
        ctx.stroke()
      }
    }
  }, [width, height, grainPoints, grainSpread, grainSizeSec, numGrains, totalSamples])

  return (
    <Box
      component="canvas"
      ref={canvasRef}
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: Math.max(0, width),
        height: Math.max(0, height),
        display: 'block',
        pointerEvents: 'none',
        borderRadius: 1,
      }}
    />
  )
}
