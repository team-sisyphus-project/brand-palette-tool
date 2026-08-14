import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// @testing-library/react's automatic afterEach cleanup only self-registers
// when it detects a global `afterEach` at module-import time; with this
// project's `test.globals: false` config that detection is unreliable, so
// register it explicitly to guarantee each test starts from a clean DOM.
afterEach(() => {
  cleanup()
})
