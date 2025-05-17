import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import commonjs from 'vite-plugin-commonjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // To exclude specific polyfills, add them to this list.
      // By default, all Node.js polyfills are included.
      // For example, if you don't want to polyfill `fs`:
      // exclude: ['fs'],
      // Whether to polyfill `global`.
      global: true,
      // Whether to polyfill `Buffer`.
      buffer: true,
      // Whether to polyfill `process`.
      process: true,
    }),
    commonjs(),
  ],
  define: {
    '__dirname': JSON.stringify('.'),
  },
  optimizeDeps: {
    // exclude: ['tesseract.js'],
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    // include: [] // Explicitly clearing/removing jimp related includes
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: false,
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
