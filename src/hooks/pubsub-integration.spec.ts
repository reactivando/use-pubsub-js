import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPubSub, PubSub } from '../pubsub'
import { usePublish } from './usePublish'
import { useSubscribe } from './useSubscribe'

vi.useFakeTimers()

const token = 'integration-token'
const message = 'integration-message'

describe('usePublish + useSubscribe integration', () => {
  afterEach(() => {
    vi.clearAllTimers()
    PubSub.clearAllSubscriptions()
  })

  it('delivers a publish from usePublish to a useSubscribe handler', () => {
    const handler = vi.fn()

    renderHook(() => useSubscribe({ token, handler }))
    const { result } = renderHook(() => usePublish({ token, message }))

    act(() => {
      result.current.publish()
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(token, message)
    expect(result.current.lastPublish).toBe(true)
  })

  it('delivers automatic publishes from usePublish to useSubscribe', () => {
    const handler = vi.fn()

    renderHook(() => useSubscribe({ token, handler }))
    renderHook(() => usePublish({ token, message, isAutomatic: true }))

    act(() => {
      vi.advanceTimersByTime(301)
    })

    expect(handler).toBeCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(token, message)
  })

  it('publishes a non-string payload through usePublish', () => {
    const handler = vi.fn()
    const payload = { count: 3 }

    renderHook(() => useSubscribe({ token, handler }))
    const { result } = renderHook(() => usePublish({ token, message: payload }))

    act(() => {
      result.current.publish()
      vi.advanceTimersByTime(0)
    })

    expect(handler).toHaveBeenCalledWith(token, payload)
  })
})

describe('usePublish + useSubscribe with a custom bus', () => {
  // biome-ignore lint/style/useConsistentTypeDefinitions: must be a type alias, not an interface — createPubSub<E extends EventMap> requires the implicit index signature that interfaces lack
  type AppEvents = {
    'user:login': { userId: string }
  }

  it('routes typed payloads through a createPubSub bus', () => {
    const bus = createPubSub<AppEvents>()
    const handler = vi.fn()

    renderHook(() => useSubscribe({ bus, token: 'user:login', handler }))
    const { result } = renderHook(() =>
      usePublish({ bus, token: 'user:login', message: { userId: '42' } }),
    )

    act(() => {
      result.current.publish()
      vi.advanceTimersByTime(0)
    })

    expect(handler).toHaveBeenCalledWith('user:login', { userId: '42' })
  })

  it('isolates a custom bus from the default PubSub singleton', () => {
    const bus = createPubSub<AppEvents>()
    const customHandler = vi.fn()
    const defaultHandler = vi.fn()

    renderHook(() =>
      useSubscribe({ bus, token: 'user:login', handler: customHandler }),
    )
    renderHook(() =>
      useSubscribe({ token: 'user:login', handler: defaultHandler }),
    )
    const { result } = renderHook(() =>
      usePublish({ bus, token: 'user:login', message: { userId: '42' } }),
    )

    act(() => {
      result.current.publish()
      vi.advanceTimersByTime(0)
    })

    expect(customHandler).toBeCalledTimes(1)
    expect(defaultHandler).toBeCalledTimes(0)
  })

  it('delivers automatic publishes through a custom bus', () => {
    const bus = createPubSub<AppEvents>()
    const handler = vi.fn()

    renderHook(() => useSubscribe({ bus, token: 'user:login', handler }))
    renderHook(() =>
      usePublish({
        bus,
        token: 'user:login',
        message: { userId: '42' },
        isAutomatic: true,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(301)
    })

    expect(handler).toHaveBeenCalledWith('user:login', { userId: '42' })
  })

  it('cleans up the custom-bus subscription on unmount', () => {
    const bus = createPubSub<AppEvents>()
    const handler = vi.fn()

    const { unmount } = renderHook(() =>
      useSubscribe({ bus, token: 'user:login', handler }),
    )
    unmount()

    act(() => {
      bus.publish('user:login', { userId: '42' })
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(0)
  })

  it('re-subscribes on the new bus when the bus reference changes', () => {
    const busA = createPubSub<AppEvents>()
    const busB = createPubSub<AppEvents>()
    const handler = vi.fn()
    let currentBus = busA

    const { rerender } = renderHook(() =>
      useSubscribe({ bus: currentBus, token: 'user:login', handler }),
    )

    act(() => {
      busA.publish('user:login', { userId: 'a' })
      vi.advanceTimersByTime(0)
    })
    expect(handler).toBeCalledTimes(1)

    currentBus = busB
    rerender()

    act(() => {
      busA.publish('user:login', { userId: 'a' })
      vi.advanceTimersByTime(0)
    })
    expect(handler).toBeCalledTimes(1) // old bus no longer delivers

    act(() => {
      busB.publish('user:login', { userId: 'b' })
      vi.advanceTimersByTime(0)
    })
    expect(handler).toBeCalledTimes(2) // new bus delivers
  })

  it('usePublish re-routes to the new bus when the bus reference changes', () => {
    const busA = createPubSub<AppEvents>()
    const busB = createPubSub<AppEvents>()
    const handlerA = vi.fn()
    const handlerB = vi.fn()
    busA.subscribe('user:login', handlerA)
    busB.subscribe('user:login', handlerB)
    let currentBus = busA

    const { result, rerender } = renderHook(() =>
      usePublish({
        bus: currentBus,
        token: 'user:login',
        message: { userId: '1' },
      }),
    )

    act(() => {
      result.current.publish()
      vi.advanceTimersByTime(0)
    })
    expect(handlerA).toBeCalledTimes(1)
    expect(handlerB).toBeCalledTimes(0)

    currentBus = busB
    rerender()

    act(() => {
      result.current.publish()
      vi.advanceTimersByTime(0)
    })
    expect(handlerA).toBeCalledTimes(1) // old bus no longer receives
    expect(handlerB).toBeCalledTimes(1) // new bus receives
  })
})
