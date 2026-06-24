// Differential / parity test (TEMPORARY migration artifact — removed in M6).
//
// Runs identical scenarios against the reference `pubsub-js` and the internal
// `PubSub`, asserting the SHARED, non-divergent surface behaves identically.
// Both are hierarchical, so dotted-topic propagation is compared here too.
//
// Intentionally EXCLUDED (documented divergences, covered by pubsub.spec.ts):
//  - symbol identity (pubsub-js stringifies symbols; the internal bus keys by
//    identity) — so this file uses string tokens only.
//  - subscribeOnce: both the return value (pubsub-js returns the bus; internal
//    returns a token) AND the concurrent-publish-before-delivery semantics
//    differ, so it is exercised only in pubsub.spec.ts, not here.
//  - wildcard / publishSync and other dropped methods.
import PubSubJs from 'pubsub-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PubSub as Internal } from './index'

interface Bus {
  clearAllSubscriptions: () => void
  publish: (token: string, data?: unknown) => boolean
  subscribe: (
    token: string,
    handler: (t: string, d: unknown) => void,
  ) => unknown
  unsubscribe: (value: unknown) => unknown
}

const buses: [string, Bus][] = [
  ['pubsub-js', PubSubJs as unknown as Bus],
  ['internal', Internal as unknown as Bus],
]

const flush = () => {
  vi.advanceTimersByTime(0)
}

for (const [name, bus] of buses) {
  describe(`parity: ${name}`, () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      bus.clearAllSubscriptions()
      vi.clearAllTimers()
      vi.useRealTimers()
    })

    it('publish returns falsy with no subscriber, truthy with one', () => {
      expect(bus.publish('none', 'm')).toBeFalsy()
      bus.subscribe('t', vi.fn())
      expect(bus.publish('t', 'm')).toBeTruthy()
    })

    it('delivers asynchronously, original token + payload by reference', () => {
      const handler = vi.fn()
      const payload = { x: 1 }
      bus.subscribe('t', handler)

      bus.publish('t', payload)
      expect(handler).toBeCalledTimes(0)

      flush()

      expect(handler.mock.calls[0][0]).toBe('t')
      expect(handler.mock.calls[0][1]).toBe(payload)
    })

    it('delivers a no-data publish with undefined payload', () => {
      const handler = vi.fn()
      bus.subscribe('t', handler)

      bus.publish('t')
      flush()

      expect(handler.mock.calls[0][1]).toBeUndefined()
    })

    it('delivers to all subscribers in subscription order', () => {
      const order: number[] = []
      bus.subscribe('t', () => order.push(1))
      bus.subscribe('t', () => order.push(2))

      bus.publish('t', 'm')
      flush()

      expect(order).toEqual([1, 2])
    })

    it('isolates a throwing subscriber from the others', () => {
      const after = vi.fn()
      bus.subscribe('t', () => {
        throw new Error('boom')
      })
      bus.subscribe('t', after)

      bus.publish('t', 'm')
      flush() // async re-throw left pending; cleared in afterEach

      expect(after).toBeCalledTimes(1)
    })

    it('unsubscribe removes only the targeted token; double-unsubscribe is falsy', () => {
      const a = vi.fn()
      const b = vi.fn()
      const tokenA = bus.subscribe('t', a)
      bus.subscribe('t', b)

      expect(bus.unsubscribe(tokenA)).toBeTruthy()
      expect(bus.unsubscribe(tokenA)).toBeFalsy()

      bus.publish('t', 'm')
      flush()

      expect(a).toBeCalledTimes(0)
      expect(b).toBeCalledTimes(1)
    })

    it('clearAllSubscriptions removes everything', () => {
      bus.subscribe('a', vi.fn())
      bus.clearAllSubscriptions()
      expect(bus.publish('a', 'm')).toBeFalsy()
    })

    describe('hierarchical dotted topics', () => {
      it('notifies exact topic then ancestors, exact-first, with the original token', () => {
        const order: string[] = []
        const tokens: string[] = []
        const record = (level: string) => (t: string) => {
          order.push(level)
          tokens.push(t)
        }
        bus.subscribe('a.b.c', record('a.b.c'))
        bus.subscribe('a.b', record('a.b'))
        bus.subscribe('a', record('a'))

        bus.publish('a.b.c', 'm')
        flush()

        expect(order).toEqual(['a.b.c', 'a.b', 'a'])
        expect(tokens).toEqual(['a.b.c', 'a.b.c', 'a.b.c'])
      })

      it('fires a handler once per subscribed level', () => {
        const handler = vi.fn()
        bus.subscribe('a', handler)
        bus.subscribe('a.b', handler)

        bus.publish('a.b.c', 'm')
        flush()

        expect(handler).toBeCalledTimes(2)
      })

      it('does not notify descendants when publishing a parent', () => {
        const child = vi.fn()
        bus.subscribe('a.b.c', child)

        bus.publish('a', 'm')
        flush()

        expect(child).toBeCalledTimes(0)
      })
    })
  })
}
