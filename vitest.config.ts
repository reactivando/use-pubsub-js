/// <reference types="vitest/globals" />

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      include: ['src/**/*.ts'],
      // Barrel (re-exports only) and type-level tests (no runtime) are excluded.
      exclude: ['src/index.ts', 'src/**/*.test-d.ts'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
})
