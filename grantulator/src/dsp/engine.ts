import { el } from '@elemaudio/core'
import WebRenderer from '@elemaudio/web-renderer'

let audioContext: AudioContext | null = null
let renderer: WebRenderer | null = null
let workletNode: AudioWorkletNode | null = null
let sampleLoaded = false
/** Kept across DSP off/on so we can reload into VFS when DSP is turned on again. */
let lastLoadedBuffer: AudioBuffer | null = null

const silence = el.const({ value: 0 })

export interface GrainPoint {
  position: number
  amplitude: number
}

export type GrainWindowMode = 'forward' | 'backward' | 'random'

function buildSingleCloud(
  position: number,
  spread: number,
  grainSizeSec: number,
  amplitude: number,
  numGrains: number,
  mode: GrainWindowMode
): [ReturnType<typeof el.mul>, ReturnType<typeof el.mul>] {
  const pos = el.const({ value: position })
  const spr = el.const({ value: spread })
  const grainRate = 1 / Math.max(0.01, grainSizeSec)
  const ph = el.phasor(el.const({ value: grainRate }))
  const N = Math.max(1, Math.min(32, Math.round(numGrains)))
  const randomOffsets =
    mode === 'random'
      ? Array.from({ length: N }, () => Math.random())
      : null
  const grains: ReturnType<typeof el.table>[] = []
  for (let i = 0; i < N; i++) {
    const phaseOffset = mode === 'random' ? randomOffsets![i]! : i / N
    const phaseInWindow = el.mod(el.add(ph, el.const({ value: phaseOffset })), el.const({ value: 1 }))
    const windowPhase =
      mode === 'backward'
        ? el.sub(el.const({ value: 1 }), phaseInWindow)
        : phaseInWindow
    const phase = el.min(
      el.const({ value: 1 }),
      el.max(el.const({ value: 0 }), el.add(pos, el.mul(spr, windowPhase)))
    )
    grains.push(el.table({ path: LOADED_SAMPLE_VFS_PATH }, phase))
  }
  let mix = grains[0]!
  for (let i = 1; i < grains.length; i++) {
    mix = el.add(mix, grains[i]!)
  }
  const gain = el.const({ value: amplitude / N })
  const out = el.mul(mix, gain)
  return [out, out]
}

/** Build granular graph for multiple points (e.g. multitouch). Each point is one cloud; outputs are summed. */
function buildMultiPointGraph(
  points: GrainPoint[],
  spread: number,
  grainSizeSec: number,
  numGrains: number,
  mode: GrainWindowMode
): [ReturnType<typeof el.add>, ReturnType<typeof el.add>] {
  const effective = points.length > 0 ? points : [{ position: 0.5, amplitude: 1 }]
  const [left0, right0] = buildSingleCloud(
    effective[0]!.position,
    spread,
    grainSizeSec,
    effective[0]!.amplitude,
    numGrains,
    mode
  )
  let left = left0
  let right = right0
  for (let i = 1; i < effective.length; i++) {
    const p = effective[i]!
    const [l, r] = buildSingleCloud(p.position, spread, grainSizeSec, p.amplitude, numGrains, mode)
    left = el.add(left, l)
    right = el.add(right, r)
  }
  return [left, right]
}

export async function renderGranular(
  points: GrainPoint[],
  spread: number,
  grainSizeSec: number,
  numGrains: number,
  mode: GrainWindowMode = 'forward'
): Promise<void> {
  if (!renderer || !sampleLoaded) return
  const [left, right] = buildMultiPointGraph(points, spread, grainSizeSec, numGrains, mode)
  await renderer.render(left, right)
}

async function renderSilence() {
  if (!renderer) return
  await renderer.render(silence, silence)
}

export async function initElementary(): Promise<void> {
  if (renderer && audioContext?.state !== 'closed') {
    return
  }

  audioContext = new AudioContext()
  renderer = new WebRenderer()
  sampleLoaded = false

  workletNode = await renderer.initialize(audioContext, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2],
  })

  workletNode.connect(audioContext.destination)

  await renderSilence()

  if (lastLoadedBuffer) {
    await loadAudioIntoVfs(lastLoadedBuffer)
  }
}

export function stopElementary(): void {
  if (workletNode) {
    workletNode.disconnect()
    workletNode = null
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close()
  }
  audioContext = null
  renderer = null
  sampleLoaded = false
  // keep lastLoadedBuffer so we can reload when DSP is turned on again
}

export function isDspRunning(): boolean {
  return renderer !== null && audioContext?.state !== 'closed'
}

export function getRenderer(): WebRenderer | null {
  return renderer
}

export function getAudioContext(): AudioContext | null {
  return audioContext
}

/** Path in the VFS where the loaded sample is stored (for use with el.sample). */
export const LOADED_SAMPLE_VFS_PATH = '/sample'

export async function loadAudioIntoVfs(audioBuffer: AudioBuffer): Promise<void> {
  lastLoadedBuffer = audioBuffer
  if (!renderer) {
    return
  }
  const numChannels = audioBuffer.numberOfChannels
  const vfs: Record<string, Float32Array | Float32Array[]> = {}
  if (numChannels === 1) {
    vfs[LOADED_SAMPLE_VFS_PATH] = new Float32Array(audioBuffer.getChannelData(0))
  } else {
    vfs[LOADED_SAMPLE_VFS_PATH] = Array.from(
      { length: numChannels },
      (_, i) => new Float32Array(audioBuffer.getChannelData(i))
    )
  }
  await renderer.updateVirtualFileSystem(vfs)
  sampleLoaded = true
}
