import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { GrainPoint } from '../stores/app'
import { MAX_GRAIN_POINTS } from '../stores/app'

const MAX_POINTS = 2000

function pointFromEvent(e: React.PointerEvent): GrainPoint {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width
  const y = (e.clientY - rect.top) / rect.height
  return {
    position: Math.max(0, Math.min(1, x)),
    amplitude: 1 - Math.max(0, Math.min(1, y)),
  }
}

interface WaveformProps {
  samples: Float32Array
  width?: number
  height?: number
  onPointsChange?: (points: GrainPoint[]) => void
}

export function Waveform({ samples, width, height, onPointsChange }: WaveformProps) {
  const theme = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | undefined>(undefined)
  const pointsByPointerRef = useRef<Map<number, GrainPoint>>(new Map())
  const [size, setSize] = useState({ width: width ?? 0, height: height ?? 0 })
  const fillContainer = width == null || height == null

  useEffect(() => {
    if (!fillContainer || !containerRef.current) return
    const el = containerRef.current
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width: w, height: h } = entry.contentRect
      setSize({ width: Math.round(w), height: Math.round(h) })
    })
    ro.observe(el)
    setSize({ width: el.offsetWidth, height: el.offsetHeight })
    return () => ro.disconnect()
  }, [fillContainer])

  const drawWidth = width ?? size.width
  const drawHeight = height ?? size.height

  const flushPoints = useCallback(() => {
    if (!onPointsChange) return
    const points = Array.from(pointsByPointerRef.current.values())
    onPointsChange(points)
  }, [onPointsChange])

  const scheduleFlush = useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      flushPoints()
      rafRef.current = undefined
    })
  }, [flushPoints])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!onPointsChange) return
      const map = pointsByPointerRef.current
      if (map.size >= MAX_GRAIN_POINTS) return
      e.currentTarget.setPointerCapture(e.pointerId)
      map.set(e.pointerId, pointFromEvent(e))
      scheduleFlush()
    },
    [onPointsChange, scheduleFlush]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!onPointsChange) return
      const map = pointsByPointerRef.current
      if (!map.has(e.pointerId)) return
      map.set(e.pointerId, pointFromEvent(e))
      scheduleFlush()
    },
    [onPointsChange, scheduleFlush]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const map = pointsByPointerRef.current
      map.delete(e.pointerId)
      scheduleFlush()
    },
    [scheduleFlush]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || samples.length === 0 || drawWidth <= 0 || drawHeight <= 0) return

    const dpr = window.devicePixelRatio ?? 1
    const w = drawWidth * dpr
    const h = drawHeight * dpr
    canvas.width = w
    canvas.height = h
    canvas.style.width = `${drawWidth}px`
    canvas.style.height = `${drawHeight}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const step = Math.max(1, Math.floor(samples.length / MAX_POINTS))
    const slice: number[] = []
    for (let i = 0; i < samples.length; i += step) {
      slice.push(samples[i]!)
    }
    const n = slice.length
    if (n < 2) return

    const midY = h / 2
    const halfH = midY - 4
    const scaleX = (w - 2) / (n - 1)

    ctx.clearRect(0, 0, w, h)
    ctx.beginPath()
    ctx.moveTo(1, midY - slice[0]! * halfH)
    for (let i = 1; i < n; i++) {
      ctx.lineTo(1 + i * scaleX, midY - slice[i]! * halfH)
    }
    for (let i = n - 1; i >= 0; i--) {
      ctx.lineTo(1 + i * scaleX, midY + slice[i]! * halfH)
    }
    ctx.closePath()
    const primary = theme.palette.primary.main
    ctx.fillStyle = alpha(primary, 0.35)
    ctx.fill()
    ctx.strokeStyle = alpha(primary, 0.9)
    ctx.lineWidth = 1
    ctx.stroke()
  }, [samples, drawWidth, drawHeight, theme.palette.primary.main])

  const boxSx = {
    borderRadius: 1,
    overflow: 'hidden' as const,
    bgcolor: 'action.hover',
    cursor: onPointsChange ? 'pointer' : 'default',
    touchAction: 'none',
    ...(fillContainer
      ? { flex: 1, minHeight: 0, width: '100%', height: '100%' }
      : { width: drawWidth, height: drawHeight }),
  }

  return (
    <Box
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      sx={boxSx}
    >
      <canvas ref={canvasRef} style={{ display: 'block', pointerEvents: 'none' }} />
    </Box>
  )
}
