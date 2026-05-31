import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  base: process.env.CF_PAGES ? '/' : '/RatingEpicGames/',
  resolve: {
    alias: { '@shared': resolve(__dirname, '../../shared/src') },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['../../shared/src/test/setup.ts'],
  },
})
