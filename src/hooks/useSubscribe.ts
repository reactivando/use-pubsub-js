import { useEffect, useCallback } from 'react'
import PubSub from 'pubsub-js'

export interface UseSubscriptionResponse {
  unsubscribe: () => void
  resubscribe: () => void
}

export interface UseSubscriptionParams<TokenType extends string | symbol> {
  token: TokenType
  handler: (token?: TokenType, message?: string) => void
  isUnsubscribe?: boolean
}

export const useSubscribe = <TokenType extends string | symbol>({
  token,
  handler,
  isUnsubscribe = false,
}: UseSubscriptionParams<TokenType>): UseSubscriptionResponse => {
  const unsubscribe = useCallback(() => {
    PubSub.unsubscribe(handler)
  }, [handler])

  const resubscribe = useCallback(() => {
    PubSub.unsubscribe(handler)

    PubSub.subscribe(token, handler)
  }, [token, handler])

  useEffect(() => {
    if (isUnsubscribe) {
      unsubscribe()
    } else {
      PubSub.subscribe(token, handler)
    }

    return () => {
      unsubscribe()
    }
  }, [isUnsubscribe])

  return { unsubscribe, resubscribe }
}
