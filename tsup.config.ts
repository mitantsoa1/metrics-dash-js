import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/react.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  external: ['react', 'react-dom', 'next', 'next/navigation'],
  banner: {
    js: '/* @metrics-dash/js v1.0.0 */',
  },
});
