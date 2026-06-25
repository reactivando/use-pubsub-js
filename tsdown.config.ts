import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/*.test-d.ts'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  unbundle: true,
  minify: true,
  platform: 'browser',
  // Explicit ES target (this is a browser library), independent of engines.node.
  target: 'es2021',
})
