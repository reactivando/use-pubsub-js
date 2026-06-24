import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPubSub, PubSub } from './index'

const flush = () => {
  vi.advanceTimersByTime(0)
}

describe('internal pub/sub module', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    PubSub.clearAllSubscriptions()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('core (createPubSub, flat)', () => {
    it('subscribe returns a string token; publish returns true with a subscriber', () => {
      const bus = createPubSub()
      const token = bus.subscribe('t', vi.fn())

      expect(typeof token).toBe('string')
      expect(bus.publish('t', 'm')).toBe(true)
    })

    it('publish returns false when there is no subscriber', () => {
      const bus = createPubSub()
      expect(bus.publish('nope', 'm')).toBe(false)
    })

    it('delivers asynchronously with the original token and payload by reference', () => {
      const bus = createPubSub<{ t: { x: number } }>()
      const handler = vi.fn()
      const payload = { x: 1 }
      bus.subscribe('t', handler)

      bus.publish('t', payload)
      expect(handler).toBeCalledTimes(0)

      flush()

      expect(handler).toBeCalledTimes(1)
      expect(handler.mock.calls[0][0]).toBe('t')
      expect(handler.mock.calls[0][1]).toBe(payload)
    })

    it('delivers a no-data publish with undefined payload', () => {
      const bus = createPubSub()
      const handler = vi.fn()
      bus.subscribe('t', handler)

      bus.publish('t')
      flush()

      expect(handler.mock.calls[0][1]).toBeUndefined()
    })

    it('delivers to every subscriber in subscription order', () => {
      const bus = createPubSub()
      const order: number[] = []
      bus.subscribe('t', () => order.push(1))
      bus.subscribe('t', () => order.push(2))

      bus.publish('t', 'm')
      flush()

      expect(order).toEqual([1, 2])
    })

    it('stays flat: does NOT propagate to ancestors', () => {
      const bus = createPubSub()
      const parent = vi.fn()
      bus.subscribe('a', parent)

      bus.publish('a.b.c', 'm')
      flush()

      expect(parent).toBeCalledTimes(0)
    })

    it('snapshots subscribers at publish time (subscribe during wait does not fire now)', () => {
      const bus = createPubSub()
      const late = vi.fn()
      bus.subscribe('t', () => {
        bus.subscribe('t', late)
      })

      bus.publish('t', 'm')
      flush()

      expect(late).toBeCalledTimes(0)
    })
  })

  describe('unsubscribe', () => {
    it('removes by token; double-unsubscribe returns false', () => {
      const bus = createPubSub()
      const handler = vi.fn()
      const token = bus.subscribe('t', handler)

      expect(bus.unsubscribe(token)).toBe(true)
      expect(bus.unsubscribe(token)).toBe(false)

      bus.publish('t', 'm')
      flush()
      expect(handler).toBeCalledTimes(0)
    })

    it('unsubscribing an unknown token returns false', () => {
      const bus = createPubSub()
      expect(bus.unsubscribe('uid_does_not_exist')).toBe(false)
    })

    it('removes by handler reference across tokens', () => {
      const bus = createPubSub()
      const handler = vi.fn()
      bus.subscribe('a', handler)
      bus.subscribe('b', handler)
      bus.subscribe('b', vi.fn())

      expect(bus.unsubscribe(handler)).toBe(true)

      bus.publish('a', 'm')
      bus.publish('b', 'm')
      flush()
      expect(handler).toBeCalledTimes(0)
    })

    it('unsubscribing an unknown handler returns false', () => {
      const bus = createPubSub()
      bus.subscribe('a', vi.fn())
      expect(bus.unsubscribe(() => undefined)).toBe(false)
    })

    it('isolates: unsubscribing one leaves others on the same token', () => {
      const bus = createPubSub()
      const a = vi.fn()
      const b = vi.fn()
      const tokenA = bus.subscribe('t', a)
      bus.subscribe('t', b)

      bus.unsubscribe(tokenA)
      bus.publish('t', 'm')
      flush()

      expect(a).toBeCalledTimes(0)
      expect(b).toBeCalledTimes(1)
    })
  })

  describe('error isolation', () => {
    it('a throwing subscriber does not stop the others', () => {
      const bus = createPubSub()
      const after = vi.fn()
      bus.subscribe('t', () => {
        throw new Error('boom')
      })
      bus.subscribe('t', after)

      bus.publish('t', 'm')
      flush() // delivery runs; the async re-throw is left pending

      expect(after).toBeCalledTimes(1)
    })

    it('re-throws a caught subscriber error asynchronously', () => {
      const bus = createPubSub()
      bus.subscribe('t', () => {
        throw new Error('boom')
      })

      bus.publish('t', 'm')

      // runAllTimers drains delivery AND the nested re-throw timer
      expect(() => vi.runAllTimers()).toThrow('boom')
    })
  })

  describe('on() / AbortSignal', () => {
    it('returns an unsubscribe function', () => {
      const bus = createPubSub()
      const handler = vi.fn()
      const off = bus.on('t', handler)

      off()
      bus.publish('t', 'm')
      flush()

      expect(handler).toBeCalledTimes(0)
    })

    it('unsubscribes when the AbortSignal aborts', () => {
      const bus = createPubSub()
      const handler = vi.fn()
      const controller = new AbortController()
      bus.on('t', handler, { signal: controller.signal })

      controller.abort()
      bus.publish('t', 'm')
      flush()

      expect(handler).toBeCalledTimes(0)
    })

    it('does not subscribe when given an already-aborted signal', () => {
      const bus = createPubSub()
      const handler = vi.fn()
      const controller = new AbortController()
      controller.abort()

      bus.on('t', handler, { signal: controller.signal })
      bus.publish('t', 'm')
      flush()

      expect(handler).toBeCalledTimes(0)
    })

    it('manual unsubscribe still delivers nothing and is safe with a signal', () => {
      const bus = createPubSub()
      const handler = vi.fn()
      const controller = new AbortController()
      const off = bus.on('t', handler, { signal: controller.signal })

      off()
      bus.publish('t', 'm')
      flush()

      expect(handler).toBeCalledTimes(0)
    })
  })

  describe('subscribeOnce', () => {
    it('fires at most once', () => {
      const bus = createPubSub()
      const handler = vi.fn()
      bus.subscribeOnce('t', handler)

      bus.publish('t', 'a')
      flush()
      bus.publish('t', 'b')
      flush()

      expect(handler).toBeCalledTimes(1)
      expect(handler.mock.calls[0][1]).toBe('a')
    })

    it('fires once even when two publishes occur before delivery', () => {
      const bus = createPubSub()
      const handler = vi.fn()
      bus.subscribeOnce('t', handler)

      // both publishes snapshot the wrapper before the first delivery runs
      bus.publish('t', 'a')
      bus.publish('t', 'b')
      flush()

      expect(handler).toBeCalledTimes(1)
      expect(handler.mock.calls[0][1]).toBe('a')
    })

    it('does not leak the subscription when the handler throws', () => {
      const bus = createPubSub()
      const handler = vi.fn(() => {
        throw new Error('boom')
      })
      bus.subscribeOnce('t', handler)

      bus.publish('t', 'a')
      flush() // handler throws; async re-throw left pending (cleared in afterEach)
      bus.publish('t', 'b')
      flush()

      expect(handler).toBeCalledTimes(1) // removed before invoking; not re-fired
    })
  })

  describe('clearAllSubscriptions', () => {
    it('removes everything', () => {
      const bus = createPubSub()
      bus.subscribe('a', vi.fn())
      bus.subscribe('b', vi.fn())

      bus.clearAllSubscriptions()

      expect(bus.publish('a', 'm')).toBe(false)
      expect(bus.publish('b', 'm')).toBe(false)
    })
  })

  describe('symbol tokens', () => {
    it('routes by the same symbol instance', () => {
      const bus = createPubSub()
      const sym = Symbol('e')
      const handler = vi.fn()
      bus.subscribe(sym, handler)

      bus.publish(sym, 'm')
      flush()

      expect(handler).toBeCalledTimes(1)
    })

    it('does NOT cross-deliver between two distinct Symbol("x") (identity keying)', () => {
      const bus = createPubSub()
      const a = vi.fn()
      const b = vi.fn()
      bus.subscribe(Symbol('x'), a)
      bus.subscribe(Symbol('x'), b)

      bus.publish(Symbol('x'), 'm')
      flush()

      expect(a).toBeCalledTimes(0)
      expect(b).toBeCalledTimes(0)
    })
  })

  describe('PubSub singleton (hierarchical)', () => {
    it('notifies exact topic then each ancestor, exact-first, with the original token', () => {
      const order: string[] = []
      const seenTokens: string[] = []
      PubSub.subscribe('a.b.c', t => {
        order.push('a.b.c')
        seenTokens.push(t as string)
      })
      PubSub.subscribe('a.b', t => {
        order.push('a.b')
        seenTokens.push(t as string)
      })
      PubSub.subscribe('a', t => {
        order.push('a')
        seenTokens.push(t as string)
      })

      PubSub.publish('a.b.c', 'm')
      flush()

      expect(order).toEqual(['a.b.c', 'a.b', 'a'])
      expect(seenTokens).toEqual(['a.b.c', 'a.b.c', 'a.b.c'])
    })

    it('fires a handler once per subscribed level', () => {
      const handler = vi.fn()
      PubSub.subscribe('a', handler)
      PubSub.subscribe('a.b', handler)

      PubSub.publish('a.b.c', 'm')
      flush()

      expect(handler).toBeCalledTimes(2)
    })

    it('does not notify descendants when publishing a parent', () => {
      const child = vi.fn()
      PubSub.subscribe('a.b.c', child)

      PubSub.publish('a', 'm')
      flush()

      expect(child).toBeCalledTimes(0)
    })

    it('symbols are identity-only on the hierarchical bus (no dotted walk)', () => {
      const sym = Symbol('a.b')
      const onA = vi.fn()
      const onSym = vi.fn()
      PubSub.subscribe('a', onA)
      PubSub.subscribe(sym, onSym)

      PubSub.publish(sym, 'm')
      flush()

      expect(onSym).toBeCalledTimes(1)
      expect(onA).toBeCalledTimes(0) // symbol is not split on '.'
    })
  })
})
