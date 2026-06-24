// Bus-contract safety net (M0 of the v2 migration).
//
// These tests pin the OBSERVABLE pub/sub contract of the library's public
// `PubSub` (today pubsub-js; after the v2 swap, the internal module). They
// import `PubSub` from the package barrel so they survive the swap with NO
// edit — any divergence in the internal reimplementation turns one of these
// red. They must pass against the current pubsub-js backend.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PubSub } from './index'

const flush = () => {
  vi.advanceTimersByTime(0)
}

describe('PubSub contract', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    PubSub.clearAllSubscriptions()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('delivers asynchronously, not during publish', () => {
    const handler = vi.fn()
    PubSub.subscribe('t', handler)

    const ok = PubSub.publish('t', 'm')

    expect(ok).toBeTruthy()
    expect(handler).toBeCalledTimes(0) // not synchronous

    flush()

    expect(handler).toBeCalledTimes(1)
  })

  it('returns falsy when there are no subscribers', () => {
    expect(PubSub.publish('nobody', 'm')).toBeFalsy()
  })

  it('delivers the original token and payload by reference', () => {
    const handler = vi.fn()
    const payload = { nested: { x: 1 } }
    PubSub.subscribe('t', handler)

    PubSub.publish('t', payload)
    flush()

    expect(handler.mock.calls[0][0]).toBe('t')
    expect(handler.mock.calls[0][1]).toBe(payload) // same reference, not cloned
  })

  it('delivers a no-data publish with undefined payload', () => {
    const handler = vi.fn()
    PubSub.subscribe('t', handler)

    PubSub.publish('t')
    flush()

    expect(handler).toBeCalledTimes(1)
    expect(handler.mock.calls[0][1]).toBeUndefined()
  })

  it('delivers to every subscriber on a token, in subscription order', () => {
    const order: number[] = []
    PubSub.subscribe('t', () => order.push(1))
    PubSub.subscribe('t', () => order.push(2))
    PubSub.subscribe('t', () => order.push(3))

    PubSub.publish('t', 'm')
    flush()

    expect(order).toEqual([1, 2, 3])
  })

  it('isolates subscriber errors: a throwing handler does not stop the others', () => {
    const after = vi.fn()
    PubSub.subscribe('t', () => {
      throw new Error('boom')
    })
    PubSub.subscribe('t', after)

    PubSub.publish('t', 'm')
    flush() // runs delivery; the re-thrown error is left as a pending timer

    expect(after).toBeCalledTimes(1)
    // pending error timer is discarded by clearAllTimers in afterEach
  })

  it('preserves order across two publishes in the same tick (A before B)', () => {
    const order: string[] = []
    PubSub.subscribe('t', (_token: string, data: string) => order.push(data))

    PubSub.publish('t', 'A')
    PubSub.publish('t', 'B')
    flush()

    expect(order).toEqual(['A', 'B'])
  })

  it('supports re-entrant publish from inside a handler', () => {
    const inner = vi.fn()
    PubSub.subscribe('outer', () => {
      PubSub.publish('inner', 'x')
    })
    PubSub.subscribe('inner', inner)

    PubSub.publish('outer', 'm')
    // outer fires and re-publishes 'inner'; runAllTimers drains the chained timer
    vi.runAllTimers()

    expect(inner).toBeCalledTimes(1)
  })

  it('unsubscribes only the targeted token; double-unsubscribe is falsy', () => {
    const handler = vi.fn()
    const token = PubSub.subscribe('t', handler)

    expect(PubSub.unsubscribe(token)).toBeTruthy()
    expect(PubSub.unsubscribe(token)).toBeFalsy() // already gone

    PubSub.publish('t', 'm')
    flush()

    expect(handler).toBeCalledTimes(0)
  })

  it('clearAllSubscriptions removes everything', () => {
    PubSub.subscribe('a', vi.fn())
    PubSub.subscribe('b', vi.fn())

    PubSub.clearAllSubscriptions()

    expect(PubSub.publish('a', 'm')).toBeFalsy()
    expect(PubSub.publish('b', 'm')).toBeFalsy()
  })

  describe('hierarchical (dotted) topics', () => {
    it('notifies the exact topic then each ancestor, exact-first', () => {
      const order: string[] = []
      PubSub.subscribe('a.b.c', () => order.push('a.b.c'))
      PubSub.subscribe('a.b', () => order.push('a.b'))
      PubSub.subscribe('a', () => order.push('a'))

      PubSub.publish('a.b.c', 'm')
      flush()

      expect(order).toEqual(['a.b.c', 'a.b', 'a'])
    })

    it('delivers the original published token to ancestor subscribers', () => {
      const handler = vi.fn()
      PubSub.subscribe('a', handler)

      PubSub.publish('a.b.c', 'm')
      flush()

      expect(handler).toBeCalledTimes(1)
      expect(handler.mock.calls[0][0]).toBe('a.b.c')
    })

    it('fires a handler once per level it is subscribed at', () => {
      const handler = vi.fn()
      PubSub.subscribe('a', handler)
      PubSub.subscribe('a.b', handler)

      PubSub.publish('a.b.c', 'm')
      flush()

      expect(handler).toBeCalledTimes(2) // once for 'a.b', once for 'a'
    })

    it('does not notify descendants when publishing a parent', () => {
      const child = vi.fn()
      PubSub.subscribe('a.b.c', child)

      PubSub.publish('a', 'm')
      flush()

      expect(child).toBeCalledTimes(0)
    })
  })

  describe('symbol tokens', () => {
    it('routes a symbol token by the same instance', () => {
      const sym = Symbol('event')
      const handler = vi.fn()
      PubSub.subscribe(sym, handler)

      PubSub.publish(sym, 'm')
      flush()

      expect(handler).toBeCalledTimes(1)
    })

    // pubsub-js stringifies symbols, so two distinct Symbol('x') COLLIDE today.
    // The v2 internal module keys by identity; activate this on the module in M1.
    it.todo(
      'does NOT cross-deliver between two distinct Symbol("x") (v2 module)',
    )
  })
})
