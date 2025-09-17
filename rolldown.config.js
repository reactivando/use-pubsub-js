import typescript from '@rollup/plugin-typescript'
import external from 'rollup-plugin-peer-deps-external'
import url from '@rollup/plugin-url'

import pkg from './package.json' with { type: 'json' }

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: pkg.module,
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
  ],
  plugins: [
    external(),
    url({ exclude: ['**/*.svg'] }),
    typescript(),
  ],
}
