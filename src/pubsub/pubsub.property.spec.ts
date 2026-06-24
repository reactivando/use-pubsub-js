import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPubSub } from './index'

// Property-based invariants for the flat bus. Delivery is async (setTimeout(0)),
// so fake timers make each publish deterministic via advanceTimersByTime(0).
const flush = () => vi.advanceTimersByTime(0)
const silent = () => createPubSub({ onError: () => undefined })

describe('PubSub property-based invariants', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('delivers a publish to exactly the handlers subscribed to that token', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { maxLength: 8 }),
        fc.string(),
        (tokens, published) => {
          const bus = silent()
          const calls = tokens.map(() => 0)
          tokens.forEach((t, i) => {
            bus.subscribe(t, () => {
              calls[i]++
            })
          })

          bus.publish(published, null)
          flush()

          // Each distinct handler fires exactly once iff its token matches the
          // published token (flat bus: exact-match only, no hierarchy).
          tokens.forEach((t, i) => {
            expect(calls[i]).toBe(t === published ? 1 : 0)
          })
        },
      ),
    )
  })

  it('never delivers to a handler after it is unsubscribed by token', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.integer({ min: 1, max: 6 }),
        (token, publishes) => {
          const bus = silent()
          const handler = vi.fn()
          const id = bus.subscribe(token, handler)
          bus.unsubscribe(id)

          for (let n = 0; n < publishes; n++) {
            bus.publish(token, n)
          }
          flush()

          expect(handler).not.toHaveBeenCalled()
        },
      ),
    )
  })

  it('fires subscribeOnce at most once regardless of publish count', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 8 }), publishes => {
        const bus = silent()
        const handler = vi.fn()
        bus.subscribeOnce('t', handler)

        for (let n = 0; n < publishes; n++) {
          bus.publish('t', n)
          flush()
        }

        expect(handler).toHaveBeenCalledTimes(1)
      }),
    )
  })

  it('routes adversarial token strings only to their own subscribers, with no prototype pollution', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          '__proto__',
          'constructor',
          'prototype',
          'toString',
          'hasOwnProperty',
          'a.b.c',
          '',
          '.',
        ),
        token => {
          const bus = silent()
          const own = vi.fn()
          const other = vi.fn()
          bus.subscribe(token, own)
          bus.subscribe('unrelated', other)

          bus.publish(token, 1)
          flush()

          expect(own).toHaveBeenCalledTimes(1)
          expect(other).not.toHaveBeenCalled()
          // Map-based storage must never touch Object.prototype.
          expect(({} as Record<string, unknown>).polluted).toBeUndefined()
          expect(
            (Object.prototype as Record<string, unknown>).polluted,
          ).toBeUndefined()
        },
      ),
    )
  })

  it('retains the most recent value per token (getSnapshot)', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.array(fc.integer(), { minLength: 1, maxLength: 6 }),
        (token, values) => {
          const bus = createPubSub<Record<string, number>>({ retained: true })
          for (const v of values) {
            bus.publish(token, v)
          }
          expect(bus.getSnapshot(token)).toBe(values.at(-1))
        },
      ),
    )
  })
})
