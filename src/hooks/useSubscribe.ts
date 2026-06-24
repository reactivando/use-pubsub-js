import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  type EventMap,
  PubSub,
  type PubSubBus,
  type SubscriptionToken,
  type TypedPubSub,
} from '../pubsub'

export interface UseSubscribeResponse {
  /** Re-subscribe `handler` to `token` (no-op if already subscribed). */
  resubscribe: () => void
  /** Unsubscribe `handler` from `token`. */
  unsubscribe: () => void
}

export interface UseSubscribeParams<
  TokenType extends string | symbol,
  Events extends EventMap = EventMap,
> {
  /**
   * The bus to subscribe on. Defaults to the shared `PubSub` singleton; pass a
   * bus from `createPubSub<Events>()` for typed payloads. Keep the reference
   * stable (e.g. module scope) — changing it re-subscribes.
   */
  bus?: PubSubBus | TypedPubSub<Events>
  /** Called on each publish to `token`; the message is typed per-token when a typed bus is used. */
  handler: (
    token: TokenType,
    message: TokenType extends keyof Events ? Events[TokenType] : unknown,
  ) => void
  /** When `true`, stay unsubscribed; toggle to subscribe/unsubscribe reactively. Default `false`. */
  isUnsubscribe?: boolean
  /** Topic to subscribe to. */
  token: TokenType
}

/**
 * Subscribe a handler to a pub/sub topic for the component's lifetime. The
 * latest `handler` is always invoked without re-subscribing.
 *
 * @example
 * ```tsx
 * useSubscribe({ token: 'cart:add', handler: (_, item) => addToCart(item) })
 * ```
 */
export const useSubscribe = <
  TokenType extends string | symbol,
  Events extends EventMap = EventMap,
>({
  token,
  handler,
  isUnsubscribe = false,
  bus = PubSub,
}: UseSubscribeParams<TokenType, Events>): UseSubscribeResponse => {
  const activeBus = bus as PubSubBus
  const handlerRef = useRef(handler)
  const subscriptionToken = useRef<SubscriptionToken | null>(null)

  useEffect(() => {
    handlerRef.current = handler
  })

  // The bus delivers `(string | symbol, unknown)`. The casts narrow back to the
  // caller's declared token/payload types — sound by construction: a typed bus
  // only ever delivers the payload registered for that token.
  const internalHandler = useCallback((msg: string | symbol, data: unknown) => {
    handlerRef.current(
      msg as TokenType,
      data as TokenType extends keyof Events ? Events[TokenType] : unknown,
    )
  }, [])

  const unsubscribe = useCallback(() => {
    if (subscriptionToken.current) {
      activeBus.unsubscribe(subscriptionToken.current)
      subscriptionToken.current = null
    }
  }, [activeBus])

  const resubscribe = useCallback(() => {
    unsubscribe()
    subscriptionToken.current = activeBus.subscribe(token, internalHandler)
  }, [activeBus, token, internalHandler, unsubscribe])

  // biome-ignore lint/correctness/useExhaustiveDependencies: token is kept explicit even though resubscribe/unsubscribe already close over it; preserves the original re-subscribe-on-token-change intent
  useEffect(() => {
    if (isUnsubscribe) {
      unsubscribe()
    } else {
      resubscribe()
    }
    return unsubscribe
  }, [isUnsubscribe, token, resubscribe, unsubscribe])

  return useMemo(
    () => ({ unsubscribe, resubscribe }),
    [unsubscribe, resubscribe],
  )
}
