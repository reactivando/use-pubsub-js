import { useCallback, useEffect, useMemo, useRef } from 'react'
import { PubSub } from '../pubsub'

type Message = unknown

export interface UseSubscriptionResponse {
  resubscribe: () => void
  unsubscribe: () => void
}

export interface UseSubscriptionParams<TokenType extends string | symbol> {
  handler: (token: TokenType, message: Message) => void
  isUnsubscribe?: boolean
  token: TokenType
}

export const useSubscribe = <TokenType extends string | symbol>({
  token,
  handler,
  isUnsubscribe = false,
}: UseSubscriptionParams<TokenType>): UseSubscriptionResponse => {
  const handlerRef = useRef(handler)
  const subscriptionToken = useRef<string | null>(null)

  useEffect(() => {
    handlerRef.current = handler
  })

  const internalHandler = useCallback((msg: string | symbol, data: Message) => {
    handlerRef.current(msg as TokenType, data)
  }, [])

  const unsubscribe = useCallback(() => {
    if (subscriptionToken.current) {
      PubSub.unsubscribe(subscriptionToken.current)
      subscriptionToken.current = null
    }
  }, [])

  const resubscribe = useCallback(() => {
    unsubscribe()
    subscriptionToken.current = PubSub.subscribe(token, internalHandler)
  }, [token, internalHandler, unsubscribe])

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
