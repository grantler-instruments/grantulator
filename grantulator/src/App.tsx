import { useEffect, useRef, useState } from 'react'
import { Box } from '@mui/material'
import { WorkInProgressBanner } from '@granter-instruments/muiTheme'
import { Header } from './components/Header'
import { Dropzone } from './components/Dropzone'
import { Waveform } from './components/Waveform'
import { GrainOverlay } from './components/GrainOverlay'
import { useAppStore } from './stores/app'
import { isDspRunning, renderGranular } from './dsp/engine'

function App() {
  const grainPoints = useAppStore((s) => s.grainPoints)
  const grainSpread = useAppStore((s) => s.grainSpread)
  const grainSizeSec = useAppStore((s) => s.grainSizeSec)
  const numGrains = useAppStore((s) => s.numGrains)
  const grainWindowMode = useAppStore((s) => s.grainWindowMode)
  const waveformSamples = useAppStore((s) => s.waveformSamples)
  const setGrainPoints = useAppStore((s) => s.setGrainPoints)

  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateSize = () => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }))
    }
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width: w, height: h } = entry.contentRect
      setSize({ width: Math.round(w), height: Math.round(h) })
    })
    ro.observe(el)
    updateSize()
    const t = requestAnimationFrame(updateSize)
    return () => {
      cancelAnimationFrame(t)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!isDspRunning()) return
    renderGranular(grainPoints, grainSpread, grainSizeSec, numGrains, grainWindowMode)
  }, [grainPoints, grainSpread, grainSizeSec, numGrains, grainWindowMode])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <WorkInProgressBanner />
      <Header />
      <Box flex={1} sx={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Dropzone>
          {waveformSamples && waveformSamples.length > 0 && (
            <Box
              ref={containerRef}
              sx={{
                position: 'relative',
                flex: 1,
                minHeight: 0,
                width: '100%',
                height: '100%',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Waveform
                samples={waveformSamples}
                onPointsChange={setGrainPoints}
              />
              <GrainOverlay
                width={size.width}
                height={size.height}
                grainPoints={grainPoints}
                grainSpread={grainSpread}
                grainSizeSec={grainSizeSec}
                numGrains={numGrains}
                totalSamples={waveformSamples.length}
              />
            </Box>
          )}
        </Dropzone>
      </Box>
    </Box>
  )
}

export default App
