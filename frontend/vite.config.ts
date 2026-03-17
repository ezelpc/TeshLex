import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vike from 'vike/plugin'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vike(), react(), tailwindcss()],
  server: { port: 5173, host: '0.0.0.0' },
  preview: { port: 5173, host: '0.0.0.0' },
})

