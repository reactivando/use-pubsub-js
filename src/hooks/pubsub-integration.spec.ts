import { act, renderHook } from '@testing-library/react'
import PubSub from 'pubsub-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

  it('should deliver a publish from usePublish to a useSubscribe handler', () => {
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

  it('should deliver automatic publishes from usePublish to useSubscribe', () => {
    const handler = vi.fn()

    renderHook(() => useSubscribe({ token, handler }))
    renderHook(() => usePublish({ token, message, isAutomatic: true }))

    act(() => {
      vi.advanceTimersByTime(301)
    })

    expect(handler).toBeCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(token, message)
  })
})
