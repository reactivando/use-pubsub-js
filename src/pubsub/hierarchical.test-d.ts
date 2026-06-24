import { describe, expectTypeOf, it } from 'vitest'
import { createHierarchicalPubSub, type DescendantKey } from './index'

// biome-ignore lint/style/useConsistentTypeDefinitions: event maps must be type aliases (need the implicit index signature interfaces lack)
type AppEvents = {
  order: { id: string }
  'order.created': { id: string; total: number }
  'order.shipped': { id: string; carrier: string }
  orders: { plural: true }
  user: { name: string }
}

declare const sym: unique symbol
// biome-ignore lint/style/useConsistentTypeDefinitions: event maps must be type aliases (need the implicit index signature interfaces lack)
type SymEvents = {
  [sym]: { v: number }
  'a.b': { w: number }
}

describe('DescendantKey', () => {
  it('includes the key itself and its dotted descendants', () => {
    expectTypeOf<DescendantKey<AppEvents, 'order'>>().toEqualTypeOf<
      'order' | 'order.created' | 'order.shipped'
    >()
  })

  it('excludes a non-dotted prefix match (orders is not a descendant of order)', () => {
    expectTypeOf<'orders'>().not.toMatchTypeOf<
      DescendantKey<AppEvents, 'order'>
    >()
  })

  it('resolves a leaf key to only itself', () => {
    expectTypeOf<
      DescendantKey<AppEvents, 'order.created'>
    >().toEqualTypeOf<'order.created'>()
  })

  it('gives a symbol key no dotted descendants', () => {
    expectTypeOf<DescendantKey<SymEvents, typeof sym>>().toEqualTypeOf<
      typeof sym
    >()
  })
})

describe('createHierarchicalPubSub typing', () => {
  const bus = createHierarchicalPubSub<AppEvents>()

  it('types publish per exact key', () => {
    expectTypeOf(bus.publish).toBeCallableWith('order.created', {
      id: '1',
      total: 1,
    })
    expectTypeOf(bus.getSnapshot('order.created')).toEqualTypeOf<
      AppEvents['order.created'] | undefined
    >()
  })

  it('gives the handler the descendant token union and payload union', () => {
    bus.subscribe('order', (token, data) => {
      expectTypeOf(token).toEqualTypeOf<
        'order' | 'order.created' | 'order.shipped'
      >()
      expectTypeOf(data).toEqualTypeOf<
        | AppEvents['order']
        | AppEvents['order.created']
        | AppEvents['order.shipped']
      >()
    })

    bus.subscribe('order.shipped', (token, data) => {
      expectTypeOf(token).toEqualTypeOf<'order.shipped'>()
      expectTypeOf(data).toEqualTypeOf<AppEvents['order.shipped']>()
    })
  })

  it('rejects wrong payloads and undeclared keys', () => {
    // @ts-expect-error wrong payload shape
    bus.publish('order.created', { id: '1' })
    // @ts-expect-error undeclared key cannot be published
    bus.publish('order.unknown', { id: '1' })
    // @ts-expect-error undeclared key cannot be subscribed
    bus.subscribe('order.unknown', () => undefined)
  })
})
