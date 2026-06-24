import { describe, expect, it } from 'vitest'
// biome-ignore lint/performance/noNamespaceImport: asserting the full module shape (named exports + absence of a default export)
import * as api from './index'

describe('package entry (src/index)', () => {
  it('exposes the named public API', () => {
    expect(typeof api.usePublish).toBe('function')
    expect(typeof api.useSubscribe).toBe('function')
    expect(typeof api.createPubSub).toBe('function')
    expect(api.PubSub).toBeDefined()
    expect(typeof api.PubSub.subscribe).toBe('function')
  })

  it('has no default export (removed in v2)', () => {
    expect((api as Record<string, unknown>).default).toBeUndefined()
  })
})
