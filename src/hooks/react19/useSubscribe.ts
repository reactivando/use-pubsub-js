import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from 'react'
import {
  type EventMap,
  PubSub,
  type PubSubBus,
  type SubscriptionToken,
  type TypedPubSub,
} from '../../pubsub'

export interface UseSubscribeResponse {
  resubscribe: () => void
  unsubscribe: () => void
}

export interface UseSubscribeParams<
  TokenType extends string | symbol,
  Events extends EventMap = EventMap,
> {
  /**
   * The bus to subscribe on. Defaults to the shared `PubSub` singleton; pass a
   * bus from `createPubSub<Events>()` for typed payloads.
   */
  bus?: PubSubBus | TypedPubSub<Events>
  handler: (
    token: TokenType,
    message: TokenType extends keyof Events ? Events[TokenType] : unknown,
  ) => void
  isUnsubscribe?: boolean
  token: TokenType
}

/**
 * React 19.2+ variant of `useSubscribe` built on `useEffectEvent`.
 *
 * Identical API to the default `useSubscribe`, but the latest `handler` is read
 * through `useEffectEvent` instead of the ref-in-an-effect pattern. This closes
 * the small window where, under concurrent rendering, a publish delivered
 * between a `handler` prop change and the ref-update effect could invoke the
 * previous handler. Requires React 19.2+ (where `useEffectEvent` is stable);
 * the default `use-pubsub-js` entry remains compatible with React 18.
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
  /* v8 ignore start -- guard reachable only on React < 19.2, not the test platform */
  if (typeof useEffectEvent !== 'function') {
    throw new Error(
      'use-pubsub-js/react19/useSubscribe requires React 19.2+ — use the default useSubscribe on older React.',
    )
  }
  /* v8 ignore stop */
  const activeBus = bus as PubSubBus
  const subscriptionToken = useRef<SubscriptionToken | null>(null)

  // Stable identity, always sees the latest handler — no handlerRef, no
  // follow-up effect that could lag a same-tick delivery.
  const internalHandler = useEffectEvent(
    (msg: string | symbol, data: unknown) => {
      handler(
        msg as TokenType,
        data as TokenType extends keyof Events ? Events[TokenType] : unknown,
      )
    },
  )

  const unsubscribe = useCallback(() => {
    if (subscriptionToken.current) {
      activeBus.unsubscribe(subscriptionToken.current)
      subscriptionToken.current = null
    }
  }, [activeBus])

  const resubscribe = useCallback(() => {
    unsubscribe()
    subscriptionToken.current = activeBus.subscribe(token, (msg, data) =>
      internalHandler(msg, data),
    )
  }, [activeBus, token, unsubscribe])

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
