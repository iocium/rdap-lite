import { defineConfig } from 'tsup';

// Node-focused build: ESM & CJS outputs + CLI
const nodeConfig = defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  target: 'es2020',
  splitting: false,
  sourcemap: true,
  clean: true,
  // Disable declaration generation to avoid missing types for external modules
  dts: false,
  shims: false,
  minify: true,
  banner: { js: '' },
  // Do not bundle ajv, leave as external dependency
  external: ['ajv'],
});

// Browser build: single IIFE bundle for direct <script> usage
const browserConfig = defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist/browser',
  format: ['iife'],
  globalName: 'rdapLite',
  target: 'es2017',
  splitting: false,
  sourcemap: true,
  clean: false,
  dts: false,
  shims: true,
  minify: true,
  banner: { js: '' },
});

export default [nodeConfig, browserConfig];
