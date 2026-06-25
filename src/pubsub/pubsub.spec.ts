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

    it('still fires a sibling unsubscribed by an earlier handler during delivery', () => {
      const bus = createPubSub()
      const sibling = vi.fn()
      // The remover is subscribed FIRST so it runs before the sibling and
      // removes it mid-dispatch. The sibling is still in the publish-time
      // snapshot, so it must fire anyway.
      let siblingToken = ''
      bus.subscribe('t', () => {
        bus.unsubscribe(siblingToken)
      })
      siblingToken = bus.subscribe('t', sibling)

      bus.publish('t', 'm')
      flush()

      expect(sibling).toBeCalledTimes(1)
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

    it('returns false on the second by-reference unsubscribe', () => {
      const bus = createPubSub()
      const handler = vi.fn()
      bus.subscribe('a', handler)
      bus.subscribe('b', handler)

      expect(bus.unsubscribe(handler)).toBe(true) // removed from both channels
      expect(bus.unsubscribe(handler)).toBe(false) // nothing left to remove
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
      const bus = createPubSub({ onError: () => undefined })
      const after = vi.fn()
      bus.subscribe('t', () => {
        throw new Error('boom')
      })
      bus.subscribe('t', after)

      bus.publish('t', 'm')
      flush()

      expect(after).toBeCalledTimes(1)
    })

    it('routes a subscriber error to onError instead of crashing the host', () => {
      const onError = vi.fn()
      const bus = createPubSub({ onError })
      const err = new Error('boom')
      bus.subscribe('t', () => {
        throw err
      })

      bus.publish('t', 'm')

      // Delivery must never re-throw — flushing the timer is always safe
      // (the pre-2.0 behavior re-threw and could crash a Node process).
      expect(() => flush()).not.toThrow()
      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(err)
    })

    it('defaults onError to console.error with the thrown error', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const bus = createPubSub() // no onError → default sink
      const err = new Error('boom')
      bus.subscribe('t', () => {
        throw err
      })

      bus.publish('t', 'm')
      flush()

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(
        '[use-pubsub-js] a subscriber threw during delivery:',
        err,
      )
      spy.mockRestore()
    })

    it('a throwing onError neither crashes delivery nor stops other subscribers', () => {
      const after = vi.fn()
      const bus = createPubSub({
        onError: () => {
          throw new Error('onError itself threw')
        },
      })
      bus.subscribe('t', () => {
        throw new Error('boom')
      })
      bus.subscribe('t', after)

      bus.publish('t', 'm')

      expect(() => flush()).not.toThrow()
      expect(after).toBeCalledTimes(1) // delivery continued past the throwing pair
    })

    it('calls onError once per throwing subscriber (N throwers → N calls)', () => {
      const onError = vi.fn()
      const bus = createPubSub({ onError })
      const after = vi.fn()
      bus.subscribe('t', () => {
        throw new Error('first')
      })
      bus.subscribe('t', () => {
        throw new Error('second')
      })
      bus.subscribe('t', after)

      bus.publish('t', 'm')
      flush()

      expect(onError).toHaveBeenCalledTimes(2)
      expect(onError.mock.calls[0][0]).toMatchObject({ message: 'first' })
      expect(onError.mock.calls[1][0]).toMatchObject({ message: 'second' })
      expect(after).toBeCalledTimes(1)
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

    it('cleanup is safe when options are passed without a signal', () => {
      const bus = createPubSub()
      const off = bus.on('t', vi.fn(), {})

      expect(() => off()).not.toThrow()
    })

    it('subscribes and cleans up safely when called without options', () => {
      const bus = createPubSub()
      const handler = vi.fn()
      const off = bus.on('t', handler)

      expect(() => off()).not.toThrow()
      bus.publish('t', 'm')
      flush()
      expect(handler).toBeCalledTimes(0)
    })

    it('removes the abort listener from the signal on manual unsubscribe', () => {
      const bus = createPubSub()
      const controller = new AbortController()
      const removeSpy = vi.spyOn(controller.signal, 'removeEventListener')
      const off = bus.on('t', vi.fn(), { signal: controller.signal })

      off()

      // No dangling reference left on the signal (prevents an AbortController leak).
      expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function))
    })

    it('is safe to abort the signal after a manual unsubscribe', () => {
      const bus = createPubSub()
      const controller = new AbortController()
      const off = bus.on('t', vi.fn(), { signal: controller.signal })

      off()

      expect(() => controller.abort()).not.toThrow()
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
      const bus = createPubSub({ onError: () => undefined })
      const handler = vi.fn(() => {
        throw new Error('boom')
      })
      bus.subscribeOnce('t', handler)

      bus.publish('t', 'a')
      flush() // handler throws; onError swallows it
      bus.publish('t', 'b')
      flush()

      expect(handler).toBeCalledTimes(1) // removed before invoking; not re-fired
    })

    it('routes a throwing once-handler through onError exactly once', () => {
      const onError = vi.fn()
      const bus = createPubSub({ onError })
      bus.subscribeOnce('t', () => {
        throw new Error('once-boom')
      })

      bus.publish('t', 'a')
      expect(() => flush()).not.toThrow()

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError.mock.calls[0][0]).toMatchObject({ message: 'once-boom' })
      expect(bus.publish('t', 'b')).toBe(false) // already removed before the throw
    })

    it('cleans the channel after firing — a later publish reports no subscribers', () => {
      const bus = createPubSub()
      bus.subscribeOnce('t', vi.fn())

      bus.publish('t', 'a')
      flush()

      expect(bus.publish('t', 'b')).toBe(false)
    })

    it('can be cancelled via its returned token before it fires', () => {
      const bus = createPubSub()
      const handler = vi.fn()
      const token = bus.subscribeOnce('t', handler)

      bus.unsubscribe(token)
      bus.publish('t', 'm')
      flush()

      expect(handler).toBeCalledTimes(0)
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

  describe('retained mode', () => {
    it('getSnapshot returns the last published value', () => {
      const bus = createPubSub({ retained: true })
      bus.publish('t', 'first')
      bus.publish('t', 'second')

      expect(bus.getSnapshot('t')).toBe('second')
    })

    it('retains the value even with no subscribers', () => {
      const bus = createPubSub({ retained: true })
      bus.publish('t', { n: 1 }) // returns false (no subscribers)
      expect(bus.getSnapshot('t')).toEqual({ n: 1 })
    })

    it('getSnapshot is always undefined when retained is off', () => {
      const bus = createPubSub() // not retained
      bus.publish('t', 'x')
      expect(bus.getSnapshot('t')).toBeUndefined()
    })

    it('getSnapshot is undefined for a never-published token', () => {
      const bus = createPubSub({ retained: true })
      expect(bus.getSnapshot('never')).toBeUndefined()
    })

    it('clearAllSubscriptions also clears retained values', () => {
      const bus = createPubSub({ retained: true })
      bus.publish('t', 'x')
      bus.clearAllSubscriptions()
      expect(bus.getSnapshot('t')).toBeUndefined()
    })

    it('retains per exact token — no spill to dotted ancestors (flat bus)', () => {
      const bus = createPubSub({ retained: true })
      bus.publish('a.b.c', 'val')

      expect(bus.getSnapshot('a.b.c')).toBe('val')
      expect(bus.getSnapshot('a.b')).toBeUndefined()
      expect(bus.getSnapshot('a')).toBeUndefined()
    })

    it('retains and returns a symbol-keyed value via getSnapshot', () => {
      const bus = createPubSub({ retained: true })
      const sym = Symbol('evt')
      bus.publish(sym, { n: 7 })

      expect(bus.getSnapshot(sym)).toEqual({ n: 7 })
    })

    it('stores an explicitly published undefined (indistinguishable from unpublished)', () => {
      const bus = createPubSub({ retained: true })
      bus.publish('t', 'initial')
      expect(bus.getSnapshot('t')).toBe('initial')

      bus.publish('t', undefined)
      expect(bus.getSnapshot('t')).toBeUndefined() // prior value is clobbered
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

    it('walks ancestors for a trailing-dot topic', () => {
      // Pins targetsFor's dotted-segment parsing: 'a.b.' -> ['a.b.', 'a.b', 'a'].
      const parent = vi.fn()
      PubSub.subscribe('a.b', parent)

      PubSub.publish('a.b.', 'm')
      flush()

      expect(parent).toBeCalledTimes(1)
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
