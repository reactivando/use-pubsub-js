import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/use-pubsub-js/',
  build: {
    sourcemap: true,
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'pubsub-js'],
  },
  plugins: [react()],
})
