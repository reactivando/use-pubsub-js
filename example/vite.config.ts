import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/use-pubsub-js/',
  build: {
    sourcemap: true,
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  plugins: [react()],
})
