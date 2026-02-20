import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/grantulator/',
  plugins: [react()],
  resolve: {
    dedupe: ['@emotion/styled', '@emotion/react', '@mui/material', '@mui/styled-engine'],
  },
})
