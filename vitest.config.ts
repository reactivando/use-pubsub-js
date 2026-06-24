/// <reference types="vitest/globals" />

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
})
