import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.spec.ts'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  unbundle: true,
  minify: true,
  platform: 'browser',
})
