/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Strict Content-Security-Policy for the production build only: everything is inlined, so the
// page may load nothing at all — not even from its own origin. (The dev server needs 'self'.)
const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function strictCsp(): Plugin {
  return {
    name: 'indigo-strict-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) =>
        html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
    },
  };
}

import { defineConfig } from 'vitest/config';

// One self-contained index.html: JS, CSS, fonts and data are all inlined, so the
// app works from any static host or straight from disk (file://) with no network.
export default defineConfig({
  base: './',
  plugins: [react(), strictCsp(), viteSingleFile({ removeViteModuleLoader: true })],
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
