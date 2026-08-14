import { defineConfig } from 'vitest/config'

// Pure-logic unit tests only (no DOM needed yet) — see src/lib/palette.test.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
