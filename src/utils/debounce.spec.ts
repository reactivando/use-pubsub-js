import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { debounce } from './debounce'

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces a function', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100)

    debounced()
    debounced()
    debounced()

    expect(func).not.toBeCalled()

    vi.advanceTimersByTime(100)

    expect(func).toBeCalledTimes(1)
  })

  it('calls the function with the last arguments', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100)

    debounced(1)
    debounced(2)
    debounced(3)

    vi.advanceTimersByTime(100)

    expect(func).toHaveBeenCalledWith(3)
  })

  it('calls the function immediately', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100, true)

    debounced()

    expect(func).toBeCalledTimes(1)
  })

  it('does not call the function again after immediate call', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100, true)

    debounced()
    debounced()

    expect(func).toBeCalledTimes(1)

    vi.advanceTimersByTime(100)

    expect(func).toBeCalledTimes(1)
  })

  it('fires immediately again on a new burst after the cooldown elapses', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100, true)

    debounced() // leading edge of the first burst
    expect(func).toBeCalledTimes(1)

    vi.advanceTimersByTime(100) // cooldown elapses; the internal timeout resets

    debounced() // leading edge of the next burst — fires immediately again
    expect(func).toBeCalledTimes(2)
  })

  it('clears the timeout', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100)

    debounced()
    debounced.clear()

    vi.advanceTimersByTime(100)

    expect(func).not.toBeCalled()
  })

  it('flushes the function', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100)

    debounced()
    debounced.flush()

    expect(func).toBeCalledTimes(1)
  })

  it('does not call the function twice after flush', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100)

    debounced()
    debounced.flush()

    expect(func).toBeCalledTimes(1)

    vi.advanceTimersByTime(100)

    expect(func).toBeCalledTimes(1)
  })

  it('reschedules when the timer fires before the full wait elapses', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100)

    debounced()
    vi.advanceTimersByTime(50)
    debounced()
    vi.advanceTimersByTime(50)

    expect(func).not.toBeCalled()

    vi.advanceTimersByTime(50)

    expect(func).toBeCalledTimes(1)
  })

  it('does nothing when flush is called with no pending timeout', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100)

    debounced.flush()

    expect(func).not.toBeCalled()
  })

  it('flushes with the last pending arguments', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100)

    debounced('first')
    debounced('second')
    debounced('third')
    debounced.flush()

    expect(func).toBeCalledTimes(1)
    expect(func).toHaveBeenCalledWith('third')
  })

  it('starts a fresh debounce window after clear', () => {
    const func = vi.fn()
    const debounced = debounce(func, 100)

    debounced()
    debounced.clear()

    // clear cancelled the pending call (would fail if clear were a no-op)
    vi.advanceTimersByTime(100)
    expect(func).not.toBeCalled()

    // a fresh call after clear starts a new window and fires once
    debounced()
    vi.advanceTimersByTime(100)
    expect(func).toBeCalledTimes(1)
  })
})
