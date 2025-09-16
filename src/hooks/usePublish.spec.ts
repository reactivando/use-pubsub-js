import { describe, it, expect, vi, afterEach } from 'vitest'
import PubSub from 'pubsub-js'
import { renderHook, act } from '@testing-library/react'
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
})
