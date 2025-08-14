import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'index.ts',
    'core/*.ts',
    'adapters/*.ts',
    'providers/*.ts',
    'stores/*.ts',
    'types/*.ts'
  ],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  external: [
    '@google/generative-ai',
    'zod',
    '@vercel/node',
    'express'
  ],
  esbuildOptions(options) {
    options.conditions = ['module'];
  }
});
