import { useState } from 'react'
import {
  AppBar,
  FormControlLabel,
  MenuItem,
  Select,
  Slider,
  Switch,
  Toolbar,
  Typography,
} from '@mui/material'
import { initElementary, renderGranular, stopElementary } from '../dsp/engine'
import type { GrainWindowMode } from '../dsp/engine'
import { useAppStore } from '../stores/app'

const WINDOW_MODE_OPTIONS: { value: GrainWindowMode; label: string }[] = [
  { value: 'forward', label: 'Fwd' },
  { value: 'backward', label: 'Bwd' },
  { value: 'random', label: 'Rand' },
]

export function Header() {
  const [dspOn, setDspOn] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const grainSpread = useAppStore((s) => s.grainSpread)
  const grainSizeSec = useAppStore((s) => s.grainSizeSec)
  const numGrains = useAppStore((s) => s.numGrains)
  const grainWindowMode = useAppStore((s) => s.grainWindowMode)
  const setGrainSpread = useAppStore((s) => s.setGrainSpread)
  const setGrainSizeSec = useAppStore((s) => s.setGrainSizeSec)
  const setNumGrains = useAppStore((s) => s.setNumGrains)
  const setGrainWindowMode = useAppStore((s) => s.setGrainWindowMode)

  const handleDspChange = async (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    if (checked) {
      setInitializing(true)
      try {
        await initElementary()
        const s = useAppStore.getState()
        await renderGranular(s.grainPoints, s.grainSpread, s.grainSizeSec, s.numGrains, s.grainWindowMode)
        setDspOn(true)
      } finally {
        setInitializing(false)
      }
    } else {
      stopElementary()
      setDspOn(false)
    }
  }

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
          Grantulator
        </Typography>
        <Typography variant="body2" sx={{ mr: 1 }}>
          Spread
        </Typography>
        <Slider
          size="small"
          value={grainSpread}
          min={0}
          max={1}
          step={0.01}
          onChange={(_, value) => setGrainSpread(value as number)}
          sx={{ width: 100 }}
          valueLabelDisplay="auto"
        />
        <Typography variant="body2" sx={{ mr: 1, ml: 1 }}>
          Grain
        </Typography>
        <Slider
          size="small"
          value={grainSizeSec}
          min={0.01}
          max={0.5}
          step={0.01}
          onChange={(_, value) => setGrainSizeSec(value as number)}
          sx={{ width: 100 }}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `${(v * 1000).toFixed(0)}ms`}
        />
        <Typography variant="body2" sx={{ mr: 1, ml: 1 }}>
          Grains
        </Typography>
        <Slider
          size="small"
          value={numGrains}
          min={1}
          max={32}
          step={1}
          onChange={(_, value) => setNumGrains(value as number)}
          sx={{ width: 80 }}
          valueLabelDisplay="auto"
        />
        <Typography variant="body2" sx={{ mr: 1, ml: 1 }}>
          Window
        </Typography>
        <Select
          size="small"
          value={grainWindowMode}
          onChange={(e) => setGrainWindowMode(e.target.value as GrainWindowMode)}
          variant="outlined"
          sx={{ minWidth: 72, height: 32 }}
        >
          {WINDOW_MODE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
        <FormControlLabel
          control={
            <Switch
              checked={dspOn}
              onChange={handleDspChange}
              disabled={initializing}
              color="default"
            />
          }
          label="DSP"
          labelPlacement="start"
        />
      </Toolbar>
    </AppBar>
  )
}
