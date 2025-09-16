import { describe, it, expect, vi, afterEach } from 'vitest'
import PubSub from 'pubsub-js'
import { renderHook, act } from '@testing-library/react'
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
})
