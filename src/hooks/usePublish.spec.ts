import PubSub from 'pubsub-js'
import { renderHook, act } from '@testing-library/react-hooks'
import { usePublish } from './usePublish'

jest.useFakeTimers('modern')

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
    jest.clearAllTimers()
    PubSub.clearAllSubscriptions()
  })

  it('should publish a message when call hook', () => {
    expect.assertions(2)

    const handler = jest.fn()

    PubSub.subscribe(token, handler)

    const { result } = defaultRender({ isInitialPublish: true })

    act(() => {
      jest.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
    expect(result.current.lastPublish).toBe(true)
  })
  it('should only publish when invoke a returned function', () => {
    expect.assertions(2)

    const handler = jest.fn()

    PubSub.subscribe(token, handler)

    const { result } = defaultRender()

    act(() => {
      result.current.publish()
      jest.advanceTimersByTime(0)
    })

    expect(handler).toBeCalledTimes(1)
    expect(result.current.lastPublish).toBe(true)
  })
  it('should publish again after 300ms when message changes', () => {
    expect.assertions(4)

    const handler = jest.fn()
    let localMessage = 'message'

    PubSub.subscribe(token, handler)

    const { result, rerender } = renderHook(() =>
      usePublish({
        token,
        message: localMessage,
        isAutomatic: true,
      }),
    )

    act(() => {
      jest.advanceTimersByTime(301)
    })

    expect(handler).toBeCalledTimes(1)
    expect(result.current.lastPublish).toBe(true)

    act(() => {
      localMessage = 'new message'
      rerender()
      jest.advanceTimersByTime(301)
    })

    expect(handler).toBeCalledTimes(2)
    expect(result.current.lastPublish).toBe(true)
  })
  it('should publish again after custom ms when message changes', () => {
    expect.assertions(4)

    const handler = jest.fn()
    let localMessage = 'message'

    PubSub.subscribe(token, handler)

    const { result, rerender } = renderHook(() =>
      usePublish({
        token,
        message: localMessage,
        isAutomatic: true,
        debounceMs: 500,
      }),
    )

    act(() => {
      jest.advanceTimersByTime(501)
    })

    expect(handler).toBeCalledTimes(1)
    expect(result.current.lastPublish).toBe(true)

    act(() => {
      localMessage = 'new message'
      rerender()
      jest.advanceTimersByTime(501)
    })

    expect(handler).toBeCalledTimes(2)
    expect(result.current.lastPublish).toBe(true)
  })
  it('should not publish again when have debounce pending then unmount', () => {
    expect.assertions(1)

    const handler = jest.fn()
    const localMessage = 'message'

    PubSub.subscribe(token, handler)

    const { unmount } = defaultRender({
      message: localMessage,
      isAutomatic: true,
    })

    act(() => {
      unmount()
      jest.advanceTimersByTime(350)
    })

    expect(handler).toBeCalledTimes(0)
  })
  it('should return false on lastPublish when not have a subscribe', () => {
    expect.assertions(1)

    const { result } = defaultRender()

    act(() => {
      jest.advanceTimersByTime(0)
    })

    expect(result.current.lastPublish).toBe(false)
  })
})
