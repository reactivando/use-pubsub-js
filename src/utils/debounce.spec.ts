import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from './debounce'

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should debounce a function', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100)

    debounced()
    debounced()
    debounced()

    expect(func).not.toBeCalled()

    vi.advanceTimersByTime(100)

    expect(func).toBeCalledTimes(1)
  })

  it('should call the function with the last arguments', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100)

    debounced(1)
    debounced(2)
    debounced(3)

    vi.advanceTimersByTime(100)

    expect(func).toHaveBeenCalledWith(3)
  })

  it('should call the function immediately', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100, true)

    debounced()

    expect(func).toBeCalledTimes(1)
  })

  it('should not call the function again after immediate call', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100, true)

    debounced()
    debounced()

    expect(func).toBeCalledTimes(1)

    vi.advanceTimersByTime(100)

    expect(func).toBeCalledTimes(1)
  })

  it('should clear the timeout', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100)

    debounced()
    debounced.clear()

    vi.advanceTimersByTime(100)

    expect(func).not.toBeCalled()
  })

  it('should flush the function', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100)

    debounced()
    debounced.flush()

    expect(func).toBeCalledTimes(1)
  })

  it('should not call the function twice after flush', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100)

    debounced()
    debounced.flush()

    expect(func).toBeCalledTimes(1)

    vi.advanceTimersByTime(100)

    expect(func).toBeCalledTimes(1)
  })
})
