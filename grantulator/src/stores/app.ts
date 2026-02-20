import { create } from 'zustand'
import type { GrainWindowMode } from '../dsp/engine'

export const MAX_GRAIN_POINTS = 10

export interface GrainPoint {
  position: number
  amplitude: number
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

interface AppState {
  grainPoints: GrainPoint[]
  grainSpread: number
  grainSizeSec: number
  numGrains: number
  grainWindowMode: GrainWindowMode
  waveformSamples: Float32Array | null
  setGrainPoints: (points: GrainPoint[]) => void
  setGrainSpread: (v: number) => void
  setGrainSizeSec: (v: number) => void
  setNumGrains: (v: number) => void
  setGrainWindowMode: (m: GrainWindowMode) => void
  setWaveformSamples: (s: Float32Array | null) => void
}

const defaultPoint: GrainPoint = { position: 0.5, amplitude: 1 }

export const useAppStore = create<AppState>((set) => ({
  grainPoints: [defaultPoint],
  grainSpread: 0.2,
  grainSizeSec: 0.05,
  numGrains: 8,
  grainWindowMode: 'forward',
  waveformSamples: null,
  setGrainPoints: (points) =>
    set({
      grainPoints: points
        .slice(0, MAX_GRAIN_POINTS)
        .map((p) => ({ position: clamp01(p.position), amplitude: clamp01(p.amplitude) })),
    }),
  setGrainSpread: (v) => set({ grainSpread: Math.max(0, Math.min(1, v)) }),
  setGrainSizeSec: (v) => set({ grainSizeSec: Math.max(0.01, Math.min(0.5, v)) }),
  setNumGrains: (v) => set({ numGrains: Math.max(1, Math.min(32, Math.round(v))) }),
  setGrainWindowMode: (m) => set({ grainWindowMode: m }),
  setWaveformSamples: (s) => set({ waveformSamples: s }),
}))
