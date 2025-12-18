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
  outExtensions({ format }) {
    if (format === 'esm' || format === 'es') return { js: '.mjs', dts: '.d.mts' }
    return { js: '.cjs', dts: '.d.cts' }
  },
})
