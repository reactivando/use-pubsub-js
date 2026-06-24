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
