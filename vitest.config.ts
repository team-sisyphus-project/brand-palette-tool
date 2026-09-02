import { defineConfig } from 'vitest/config'

// jsdom so component tests (src/**/*.test.tsx) can render with
// @testing-library/react; plain logic tests (src/**/*.test.ts) run fine
// under jsdom too, so one environment covers both.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
