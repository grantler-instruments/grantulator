import { useRef, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import {
  isDspRunning,
  loadAudioIntoVfs,
  LOADED_SAMPLE_VFS_PATH,
  renderGranular,
} from '../dsp/engine'
import { useAppStore } from '../stores/app'

const ACCEPT_AUDIO = 'audio/*'

function decodeAudioFile(file: File): Promise<AudioBuffer> {
  return file.arrayBuffer().then((arrayBuffer) => {
    const ctx = new OfflineAudioContext(1, 1, 44100)
    return ctx.decodeAudioData(arrayBuffer.slice(0))
  })
}

function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/')
}

interface DropzoneProps {
  children?: React.ReactNode
}

export function Dropzone({ children }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedName, setLoadedName] = useState<string | null>(null)
  const setWaveformSamples = useAppStore((s) => s.setWaveformSamples)
  const getStoreState = useAppStore.getState

  const processFile = async (file: File) => {
    if (!isAudioFile(file)) {
      setError('Please drop or select an audio file.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const buffer = await decodeAudioFile(file)
      setWaveformSamples(new Float32Array(buffer.getChannelData(0)))
      await loadAudioIntoVfs(buffer)
      if (isDspRunning()) {
        const s = getStoreState()
        await renderGranular(
          s.grainPoints,
          s.grainSpread,
          s.grainSizeSec,
          s.numGrains,
          s.grainWindowMode
        )
      }
      setLoadedName(file.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audio.')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleOpenClick = () => inputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const hasChildren = children != null && (Array.isArray(children) ? children.length > 0 : true)

  return (
    <Box
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        mx: 2,
        my: 1,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_AUDIO}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          borderRadius: 2,
          bgcolor: dragOver ? 'action.hover' : 'transparent',
          transition: 'background-color 0.15s, border-color 0.15s',
          overflow: 'hidden',
        }}
      >
        {hasChildren ? (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {children}
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FolderOpenIcon />}
                onClick={handleOpenClick}
                disabled={loading}
              >
                Open file
              </Button>
              <Typography variant="body2" color="text.secondary">
                or drop an audio file here
              </Typography>
              {loadedName && (
                <Typography variant="caption" color="primary.main">
                  Loaded: {loadedName} → {LOADED_SAMPLE_VFS_PATH}
                </Typography>
              )}
              {error && (
                <Typography variant="caption" color="error">
                  {error}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}
