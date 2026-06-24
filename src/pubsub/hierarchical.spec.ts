import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHierarchicalPubSub } from './index'

// biome-ignore lint/style/useConsistentTypeDefinitions: must be a type alias — createHierarchicalPubSub<E extends EventMap> needs the implicit index signature interfaces lack
type Events = {
  order: { id: string }
  'order.created': { id: string; total: number }
}

const flush = () => vi.advanceTimersByTime(0)

describe('createHierarchicalPubSub', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('notifies the exact topic then each ancestor, with the published token', () => {
    const bus = createHierarchicalPubSub<Events>()
    const order: string[] = []
    const seen: string[] = []
    bus.subscribe('order.created', t => {
      order.push('order.created')
      seen.push(t as string)
    })
    bus.subscribe('order', t => {
      order.push('order')
      seen.push(t as string)
    })

    bus.publish('order.created', { id: '1', total: 9 })
    flush()

    expect(order).toEqual(['order.created', 'order'])
    expect(seen).toEqual(['order.created', 'order.created']) // original token
  })

  it('does not notify descendants when publishing a parent', () => {
    const bus = createHierarchicalPubSub<Events>()
    const child = vi.fn()
    bus.subscribe('order.created', child)

    bus.publish('order', { id: '1' })
    flush()

    expect(child).toBeCalledTimes(0)
  })

  it('delivers the published payload to ancestor subscribers', () => {
    const bus = createHierarchicalPubSub<Events>()
    const handler = vi.fn()
    bus.subscribe('order', handler)

    bus.publish('order.created', { id: '1', total: 9 })
    flush()

    expect(handler.mock.calls[0][1]).toEqual({ id: '1', total: 9 })
  })

  it('retains the last value per exact token when retained', () => {
    const bus = createHierarchicalPubSub<Events>({ retained: true })
    bus.publish('order.created', { id: '1', total: 9 })

    expect(bus.getSnapshot('order.created')).toEqual({ id: '1', total: 9 })
    expect(bus.getSnapshot('order')).toBeUndefined() // exact-token only
  })

  it('routes a subscriber error to onError without crashing delivery', () => {
    const onError = vi.fn()
    const bus = createHierarchicalPubSub<Events>({ onError })
    const after = vi.fn()
    bus.subscribe('order.created', () => {
      throw new Error('boom')
    })
    bus.subscribe('order', after)

    bus.publish('order.created', { id: '1', total: 9 })
    expect(() => flush()).not.toThrow()

    expect(onError).toHaveBeenCalledTimes(1)
    expect(after).toBeCalledTimes(1)
  })
})
