import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vike from 'vike/plugin'

export default defineConfig({
  plugins: [vike(), react()],
  server: { port: 5173, host: '0.0.0.0' },
  preview: { port: 5173, host: '0.0.0.0' },
})

