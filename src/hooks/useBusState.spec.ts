import { act, renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPubSub, PubSub } from '../pubsub'
import { useBusState } from './useBusState'

vi.useFakeTimers()

describe('useBusState', () => {
  afterEach(() => {
    vi.clearAllTimers()
    PubSub.clearAllSubscriptions()
  })

  it('returns the initial value before any publish', () => {
    const { result } = renderHook(() =>
      useBusState({ token: 'count', initialValue: 0 }),
    )

    expect(result.current).toBe(0)
  })

  it('updates when a value is published while mounted (default bus)', () => {
    const { result } = renderHook(() =>
      useBusState({ token: 'count', initialValue: 0 }),
    )

    act(() => {
      PubSub.publish('count', 5)
      vi.advanceTimersByTime(0)
    })

    expect(result.current).toBe(5)
  })

  it('reads the last value on mount from a retained bus', () => {
    const bus = createPubSub<{ count: number }>({ retained: true })
    bus.publish('count', 42) // published before the component mounts

    const { result } = renderHook(() =>
      useBusState({ bus, token: 'count', initialValue: 0 }),
    )

    // Available immediately on first render — no publish-after-mount needed.
    expect(result.current).toBe(42)
  })

  it('reflects subsequent publishes on a retained bus', () => {
    const bus = createPubSub<{ count: number }>({ retained: true })
    const { result } = renderHook(() =>
      useBusState({ bus, token: 'count', initialValue: 0 }),
    )

    expect(result.current).toBe(0)

    act(() => {
      bus.publish('count', 7)
      vi.advanceTimersByTime(0)
    })

    expect(result.current).toBe(7)
  })

  it('unsubscribes from the bus on unmount', () => {
    const bus = createPubSub<{ count: number }>({ retained: true })
    // Wrap the cleanup returned by bus.on so we can prove it was invoked.
    const cleanupSpy = vi.fn()
    const realOn = bus.on.bind(bus)
    vi.spyOn(bus, 'on').mockImplementation((token, handler, options) => {
      const off = realOn(token, handler, options)
      return () => {
        cleanupSpy()
        off()
      }
    })

    const { result, unmount } = renderHook(() =>
      useBusState({ bus, token: 'count', initialValue: 0 }),
    )

    act(() => {
      bus.publish('count', 1)
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toBe(1)

    unmount()
    expect(cleanupSpy).toHaveBeenCalledTimes(1) // subscription was cleaned up

    act(() => {
      bus.publish('count', 2)
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toBe(1) // unmounted hook does not re-render
  })

  it('does not surface a stale value after the bus prop changes', () => {
    const busA = createPubSub<{ v: number }>() // non-retained
    const busB = createPubSub<{ v: number }>() // non-retained
    let currentBus = busA

    const { result, rerender } = renderHook(() =>
      useBusState({ bus: currentBus, token: 'v', initialValue: 0 }),
    )

    act(() => {
      busA.publish('v', 42)
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toBe(42)

    currentBus = busB
    rerender()

    // busB never published 'v', so the hook must fall back to initialValue —
    // not leak busA's last value through the shared latest-value ref.
    expect(result.current).toBe(0)
  })

  it('reads the new token snapshot when the token prop changes on a retained bus', () => {
    const bus = createPubSub<{ a: number; b: number }>({ retained: true })
    bus.publish('a', 10)
    bus.publish('b', 99)

    let currentToken: 'a' | 'b' = 'a'
    const { result, rerender } = renderHook(() =>
      useBusState({ bus, token: currentToken, initialValue: 0 }),
    )
    expect(result.current).toBe(10)

    currentToken = 'b'
    rerender()

    expect(result.current).toBe(99) // immediately reads retained 'b', not 0 or 10
  })

  it('ignores an undefined payload (keeps the prior value)', () => {
    const bus = createPubSub<{ x: number | undefined }>({ retained: true })
    const { result } = renderHook(() =>
      useBusState({ bus, token: 'x', initialValue: 0 }),
    )

    act(() => {
      bus.publish('x', 42)
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toBe(42)

    act(() => {
      bus.publish('x', undefined)
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toBe(42) // undefined is treated as "no value"
  })

  it('reflects only the last value when publishes arrive in the same tick', () => {
    const bus = createPubSub<{ count: number }>({ retained: true })
    const { result } = renderHook(() =>
      useBusState({ bus, token: 'count', initialValue: 0 }),
    )

    act(() => {
      bus.publish('count', 1)
      bus.publish('count', 2)
      vi.advanceTimersByTime(0)
    })

    expect(result.current).toBe(2)
  })

  it('renders the server snapshot (initial value) during SSR', () => {
    const bus = createPubSub<{ count: number }>({ retained: true })
    bus.publish('count', 99) // retained, but SSR must use the server snapshot

    const Comp = () =>
      createElement(
        'span',
        null,
        String(useBusState({ bus, token: 'count', initialValue: 0 })),
      )

    const html = renderToStaticMarkup(createElement(Comp))

    expect(html).toContain('>0<') // getServerSnapshot → initialValue, not 99
  })
})
