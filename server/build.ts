/**
 * `npm run build:server`: bundle the server and its dependencies into one file,
 * dist-server/index.mjs, so the runtime image needs no node_modules.
 */
import { build } from 'esbuild';

await build({
  entryPoints: ['server/index.ts'],
  outfile: 'dist-server/index.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: true,
  minify: true,
  tsconfig: 'tsconfig.json',
  // pg's optional native binding is never used.
  external: ['pg-native'],
  // Bundled CommonJS dependencies call require(); give the ESM bundle one.
  banner: {
    js: "import { createRequire as __cfRequire } from 'node:module'; const require = __cfRequire(import.meta.url);",
  },
  logLevel: 'info',
});
