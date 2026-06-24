import { act, renderHook } from '@testing-library/react'
import { version as reactVersion } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PubSub } from '../../pubsub'
import { useSubscribe } from './useSubscribe'

vi.useFakeTimers()

// useEffectEvent is stable from React 19.2; on older React (e.g. the 18 CI
// matrix cell) this whole suite is skipped — the subpath targets 19.2+ only.
const [major, minor] = reactVersion.split('.').map(Number)
const hasEffectEvent = major > 19 || (major === 19 && minor >= 2)

const token = 'test'
const message = 'message'
const publish = () => PubSub.publish(token, message)

describe.skipIf(!hasEffectEvent)(
  'react19/useSubscribe (useEffectEvent)',
  () => {
    afterEach(() => {
      vi.clearAllTimers()
      PubSub.clearAllSubscriptions()
    })

    it('receives a published message', () => {
      const handler = vi.fn()
      renderHook(() => useSubscribe({ token, handler }))

      publish()
      act(() => {
        vi.advanceTimersByTime(0)
      })

      expect(handler).toBeCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(token, message)
    })

    // Asserts external behavior parity with the default hook (latest handler is
    // used after a prop change). The concurrent-render window that useEffectEvent
    // specifically closes can't be reproduced with jsdom + fake timers.
    it('invokes the latest handler without resubscribing', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      let current = handler1

      const { rerender } = renderHook(() =>
        useSubscribe({ token, handler: current }),
      )

      act(() => {
        publish()
        vi.advanceTimersByTime(0)
      })
      expect(handler1).toBeCalledTimes(1)
      expect(handler2).toBeCalledTimes(0)

      current = handler2
      rerender()

      act(() => {
        publish()
        vi.advanceTimersByTime(0)
      })
      expect(handler1).toBeCalledTimes(1)
      expect(handler2).toBeCalledTimes(1)
    })

    it('unsubscribes on unmount', () => {
      const handler = vi.fn()
      const { unmount } = renderHook(() => useSubscribe({ token, handler }))

      unmount()
      publish()
      act(() => {
        vi.advanceTimersByTime(0)
      })

      expect(handler).toBeCalledTimes(0)
    })

    it('unsubscribes and resubscribes via the returned functions', () => {
      const handler = vi.fn()
      const { result } = renderHook(() => useSubscribe({ token, handler }))

      result.current.unsubscribe()
      act(() => {
        publish()
        vi.advanceTimersByTime(0)
      })
      expect(handler).toBeCalledTimes(0)

      result.current.resubscribe()
      act(() => {
        publish()
        vi.advanceTimersByTime(0)
      })
      expect(handler).toBeCalledTimes(1)
    })

    it('resubscribes to the new token when token changes', () => {
      const handler = vi.fn()
      let currentToken = token

      const { rerender } = renderHook(() =>
        useSubscribe({ token: currentToken, handler }),
      )

      currentToken = 'other'
      rerender()

      act(() => {
        publish() // old token — should not fire
        vi.advanceTimersByTime(0)
      })
      expect(handler).toBeCalledTimes(0)

      act(() => {
        PubSub.publish('other', message)
        vi.advanceTimersByTime(0)
      })
      expect(handler).toBeCalledTimes(1)
    })

    it('does not subscribe when isUnsubscribe is true', () => {
      const handler = vi.fn()
      renderHook(() => useSubscribe({ token, handler, isUnsubscribe: true }))

      publish()
      act(() => {
        vi.advanceTimersByTime(0)
      })

      expect(handler).toBeCalledTimes(0)
    })

    it('routes messages for a Symbol token', () => {
      const symbolToken = Symbol('event')
      const handler = vi.fn()
      renderHook(() => useSubscribe({ token: symbolToken, handler }))

      act(() => {
        PubSub.publish(symbolToken, 'payload')
        vi.advanceTimersByTime(0)
      })

      expect(handler).toBeCalledTimes(1)
      expect(handler.mock.calls[0][1]).toBe('payload')
    })

    it('delivers to multiple independent subscribers and by reference', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const payload = { nested: 1 }
      renderHook(() => useSubscribe({ token, handler: handler1 }))
      renderHook(() => useSubscribe({ token, handler: handler2 }))

      act(() => {
        PubSub.publish(token, payload)
        vi.advanceTimersByTime(0)
      })

      expect(handler1).toBeCalledTimes(1)
      expect(handler2).toBeCalledTimes(1)
      expect(handler1.mock.calls[0][1]).toBe(payload) // same reference, not cloned
    })

    it('resubscribes when isUnsubscribe is toggled back to false', () => {
      const handler = vi.fn()
      let isUnsubscribe = true

      const { rerender } = renderHook(() =>
        useSubscribe({ token, handler, isUnsubscribe }),
      )

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
  },
)
