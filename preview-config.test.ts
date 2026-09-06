import { describe, expect, it } from 'vitest'
import { resolveAllowedHosts, resolvePort } from './preview-config'

describe('resolvePort', () => {
  it('uses the injected PORT value', () => {
    expect(resolvePort('8080', 4173)).toBe(8080)
  })

  it('falls back when PORT is unset or unusable', () => {
    expect(resolvePort(undefined, 4173)).toBe(4173)
    expect(resolvePort('', 4173)).toBe(4173)
    expect(resolvePort('not-a-port', 4173)).toBe(4173)
    expect(resolvePort('0', 4173)).toBe(4173)
    expect(resolvePort('70000', 4173)).toBe(4173)
    expect(resolvePort('8080.5', 4173)).toBe(4173)
  })
})

describe('resolveAllowedHosts', () => {
  it('accepts any host when no allow-list is configured', () => {
    expect(resolveAllowedHosts(undefined)).toBe(true)
    expect(resolveAllowedHosts('')).toBe(true)
    expect(resolveAllowedHosts('  ,  ')).toBe(true)
  })

  it('narrows to the configured hosts when ALLOWED_HOSTS is set', () => {
    expect(resolveAllowedHosts('app.example.com, localhost')).toEqual([
      'app.example.com',
      'localhost',
    ])
  })
})
