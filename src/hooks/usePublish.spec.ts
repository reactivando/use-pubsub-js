import { act, renderHook } from '@testing-library/react'
import PubSub from 'pubsub-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePublish } from './usePublish'

vi.useFakeTimers()

const token = 'test'
const message = 'message'

const defaultRender = ({ ...props } = {}) =>
  renderHook(() =>
    usePublish({
      token,
      message,
      ...props,
    }),
  )

describe('usePublish', () => {
  afterEach(() => {
    vi.clearAllTimers()
    PubSub.clearAllSubscriptions()
  })

  it('should publish a message when call hook', () => {
    const handler = vi.fn()

    PubSub.subscribe(token, handler)

    const { result } = defaultRender({ isInitialPublish: true })

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
    expect(result.current.lastPublish).toBe(true)
  })
  it('should only publish when invoke a returned function', () => {
    const handler = vi.fn()

    PubSub.subscribe(token, handler)

    const { result } = defaultRender()

    act(() => {
      result.current.publish()
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
    expect(result.current.lastPublish).toBe(true)
  })
  it('should publish again after 300ms when message changes', () => {
    const handler = vi.fn()

    PubSub.subscribe(token, handler)

    const { result, rerender } = renderHook(
      (props: { message: string }) =>
        usePublish({
          token,
          message: props.message,
          isAutomatic: true,
        }),
      { initialProps: { message: 'message' } },
    )

    act(() => {
      vi.advanceTimersByTime(301)
    })

    expect(handler).toBeCalledTimes(1)
    expect(result.current.lastPublish).toBe(true)

    act(() => {
      rerender({ message: 'new message' })
    })
    act(() => {
      vi.advanceTimersByTime(301)
    })

    expect(handler).toBeCalledTimes(2)
    expect(result.current.lastPublish).toBe(true)
  })
  it('should publish again after custom ms when message changes', () => {
    const handler = vi.fn()

    PubSub.subscribe(token, handler)

    const { result, rerender } = renderHook(
      (props: { message: string }) =>
        usePublish({
          token,
          message: props.message,
          isAutomatic: true,
          debounceMs: 500,
        }),
      { initialProps: { message: 'message' } },
    )

    act(() => {
      vi.advanceTimersByTime(501)
    })

    expect(handler).toBeCalledTimes(1)
    expect(result.current.lastPublish).toBe(true)

    act(() => {
      rerender({ message: 'new message' })
    })
    act(() => {
      vi.advanceTimersByTime(501)
    })

    expect(handler).toBeCalledTimes(2)
    expect(result.current.lastPublish).toBe(true)
  })
  it('should not publish again when have debounce pending then unmount', () => {
    const handler = vi.fn()
    const localMessage = 'message'

    PubSub.subscribe(token, handler)

    const { unmount } = defaultRender({
      message: localMessage,
      isAutomatic: true,
    })

    act(() => {
      unmount()
      vi.advanceTimersByTime(350)
    })

    expect(handler).toBeCalledTimes(0)
  })
  it('should return false on lastPublish when not have a subscribe', () => {
    const { result } = defaultRender()

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(result.current.lastPublish).toBe(false)
  })
  it('should publish immediately when isImmediate and isAutomatic are true', () => {
    const handler = vi.fn()

    PubSub.subscribe(token, handler)

    defaultRender({ isAutomatic: true, isImmediate: true })

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
  })
  it('should publish after the delay when debounceMs is given as a string', () => {
    const handler = vi.fn()

    PubSub.subscribe(token, handler)

    defaultRender({ isAutomatic: true, debounceMs: '200' })

    act(() => {
      vi.advanceTimersByTime(199)
    })

    expect(handler).toBeCalledTimes(0)

    act(() => {
      vi.advanceTimersByTime(2)
    })

    expect(handler).toBeCalledTimes(1)
  })
  it('should not publish automatically when message is empty', () => {
    const handler = vi.fn()

    PubSub.subscribe(token, handler)

    renderHook(() => usePublish({ token, message: '', isAutomatic: true }))

    act(() => {
      vi.advanceTimersByTime(301)
    })

    expect(handler).toBeCalledTimes(0)
  })
  it('should fall back to the default delay when debounceMs is not a number', () => {
    const handler = vi.fn()

    PubSub.subscribe(token, handler)

    defaultRender({ isAutomatic: true, debounceMs: 'not-a-number' })

    act(() => {
      vi.advanceTimersByTime(299)
    })

    expect(handler).toBeCalledTimes(0)

    act(() => {
      vi.advanceTimersByTime(2)
    })

    expect(handler).toBeCalledTimes(1)
  })
  it('should set lastPublish to false after the subscriber unsubscribes', () => {
    const handler = vi.fn()
    const subscription = PubSub.subscribe(token, handler)

    const { result } = defaultRender()

    act(() => {
      result.current.publish()
      vi.advanceTimersByTime(0)
    })

    expect(result.current.lastPublish).toBe(true)

    PubSub.unsubscribe(subscription)

    act(() => {
      result.current.publish()
      vi.advanceTimersByTime(0)
    })

    expect(result.current.lastPublish).toBe(false)
  })
  it('should publish only once with isInitialPublish across rerenders', () => {
    const handler = vi.fn()

    PubSub.subscribe(token, handler)

    const { rerender } = renderHook(
      (props: { message: string }) =>
        usePublish({
          token,
          message: props.message,
          isInitialPublish: true,
        }),
      { initialProps: { message: 'first' } },
    )

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)

    act(() => {
      rerender({ message: 'second' })
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
  })
  it('should not publish again at the trailing edge when isImmediate is true', () => {
    const handler = vi.fn()

    PubSub.subscribe(token, handler)

    defaultRender({ isAutomatic: true, isImmediate: true })

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(handler).toBeCalledTimes(1)
  })
})
