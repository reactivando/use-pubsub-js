import pkg from './package.json' with { type: 'json' }
import { esmExternalRequirePlugin } from 'rolldown/experimental'

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
    esmExternalRequirePlugin({
      external: Object.keys(pkg.peerDependencies || {}),
    }),
  ],
}
