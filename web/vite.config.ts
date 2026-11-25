/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig } from 'vitest/config';

// One self-contained index.html: JS, CSS, fonts and data are all inlined, so the
// app works from any static host or straight from disk (file://) with no network.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: 'es2024',
    // The modulepreload polyfill uses fetch(); everything is inlined anyway.
    modulePreload: false,
    assetsInlineLimit: Number.POSITIVE_INFINITY,
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
