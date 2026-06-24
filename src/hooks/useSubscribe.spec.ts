import { act, renderHook } from '@testing-library/react'
import PubSub from 'pubsub-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSubscribe } from './useSubscribe'

vi.useFakeTimers()

const token = 'test'
const message = 'message'

const publish = () => PubSub.publish(token, message)

describe('useSubscribe', () => {
  afterEach(() => {
    vi.clearAllTimers()
    PubSub.clearAllSubscriptions()
  })

  it('should receive a published message', () => {
    const handler = vi.fn()

    renderHook(() => useSubscribe({ token, handler }))

    const isPublished = publish()

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
    expect(isPublished).toBe(true)
  })
  it('should unsubscribe when isUnsubscribe is changed to true', () => {
    const handler = vi.fn()
    let isUnsubscribe = false

    const { rerender } = renderHook(() =>
      useSubscribe({ token, handler, isUnsubscribe }),
    )

    const isPublished = publish()

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
    expect(isPublished).toBe(true)

    isUnsubscribe = true
    rerender()

    const isPublishedChanged = publish()

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
    expect(isPublishedChanged).toBe(false)
  })
  it('should unsubscribe when invoke unsubscribe function', () => {
    const handler = vi.fn()

    const { result } = renderHook(() => useSubscribe({ token, handler }))

    const isPublished = publish()

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
    expect(isPublished).toBe(true)

    result.current.unsubscribe()

    const isPublishedChanged = publish()

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
    expect(isPublishedChanged).toBe(false)
  })
  it('should resubscribe after unsubscribe', () => {
    const handler = vi.fn()

    const { result } = renderHook(() => useSubscribe({ token, handler }))

    result.current.unsubscribe()

    const isPublished = publish()

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(0)
    expect(isPublished).toBe(false)

    result.current.resubscribe()

    const isPublishedChanged = publish()

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
    expect(isPublishedChanged).toBe(true)
  })
  it('should unsubscribe when hook is unmounted', () => {
    const handler = vi.fn()

    const { unmount } = renderHook(() => useSubscribe({ token, handler }))

    const isPublished = publish()

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
    expect(isPublished).toBe(true)

    unmount()

    const isPublishedChanged = publish()

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
    expect(isPublishedChanged).toBe(false)
  })

  it('should not call the old handler when the handler changes', () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    let currentHandler = handler1

    const { rerender } = renderHook(() =>
      useSubscribe({ token, handler: currentHandler }),
    )

    act(() => {
      publish()
      vi.advanceTimersByTime(0)
    })

    expect(handler1).toBeCalledTimes(1)
    expect(handler2).toBeCalledTimes(0)

    currentHandler = handler2
    rerender()

    act(() => {
      publish()
      vi.advanceTimersByTime(0)
    })

    expect(handler1).toBeCalledTimes(1)
    expect(handler2).toBeCalledTimes(1)
  })

  it('should resubscribe when isUnsubscribe is toggled back to false', () => {
    const handler = vi.fn()
    let isUnsubscribe = false

    const { rerender } = renderHook(() =>
      useSubscribe({ token, handler, isUnsubscribe }),
    )

    isUnsubscribe = true
    rerender()

    act(() => {
      publish()
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(0)

    isUnsubscribe = false
    rerender()

    act(() => {
      publish()
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
  })

  it('should resubscribe to the new token when token changes', () => {
    const handler = vi.fn()
    const token2 = 'test2'
    let currentToken = token

    const { rerender } = renderHook(() =>
      useSubscribe({ token: currentToken, handler }),
    )

    act(() => {
      publish()
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)

    currentToken = token2
    rerender()

    act(() => {
      publish()
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)

    act(() => {
      PubSub.publish(token2, message)
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(2)
  })

  it('should not duplicate when resubscribe is called while subscribed', () => {
    const handler = vi.fn()

    const { result } = renderHook(() => useSubscribe({ token, handler }))

    act(() => {
      result.current.resubscribe()
    })

    act(() => {
      publish()
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
  })

  it('should deliver the message asynchronously, not during publish', () => {
    const handler = vi.fn()

    renderHook(() => useSubscribe({ token, handler }))

    publish()

    expect(handler).toBeCalledTimes(0)

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
  })

  it('should call the handler with the published token and message', () => {
    const handler = vi.fn()

    renderHook(() => useSubscribe({ token, handler }))

    publish()

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toHaveBeenCalledWith(token, message)
  })

  it('should deliver object payloads by reference', () => {
    const handler = vi.fn()
    const payload = { arr: [1, 2, 3], nested: { x: 1 } }

    renderHook(() => useSubscribe({ token, handler }))

    PubSub.publish(token, payload)

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler.mock.calls[0][1]).toBe(payload)
  })

  it('should deliver to every independent subscriber on the same token', () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    renderHook(() => useSubscribe({ token, handler: handler1 }))
    renderHook(() => useSubscribe({ token, handler: handler2 }))

    act(() => {
      publish()
      vi.advanceTimersByTime(0)
    })

    expect(handler1).toBeCalledTimes(1)
    expect(handler2).toBeCalledTimes(1)
  })

  it('should only unsubscribe the targeted hook, leaving others subscribed', () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    const { result } = renderHook(() =>
      useSubscribe({ token, handler: handler1 }),
    )
    renderHook(() => useSubscribe({ token, handler: handler2 }))

    result.current.unsubscribe()

    act(() => {
      publish()
      vi.advanceTimersByTime(0)
    })

    expect(handler1).toBeCalledTimes(0)
    expect(handler2).toBeCalledTimes(1)
  })

  it('should route messages for a Symbol token', () => {
    const symbolToken = Symbol('event')
    const handler = vi.fn()

    renderHook(() => useSubscribe({ token: symbolToken, handler }))

    PubSub.publish(symbolToken, message)

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
    expect(handler.mock.calls[0][1]).toBe(message)
  })
})
