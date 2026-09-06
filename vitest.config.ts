import { defineConfig } from 'vitest/config'

// jsdom so component tests (src/**/*.test.tsx) can render with
// @testing-library/react; plain logic tests (src/**/*.test.ts) run fine
// under jsdom too, so one environment covers both.
//
// preview-config.test.ts lives at the root because it covers the build/serve
// configuration itself, not application code. It cannot be named
// vite.config.test.ts — vitest's default `exclude` drops **/vite.config.*.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'preview-config.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
