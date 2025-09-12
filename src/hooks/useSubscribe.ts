import { useEffect, useCallback } from 'react'
import PubSub from 'pubsub-js'

export interface UseSubscriptionResponse {
  unsubscribe: () => void
  resubscribe: () => void
}

export interface UseSubscriptionParams<TokenType extends string | symbol> {
  token: TokenType
  handler: (token: TokenType, message: any) => void
  isUnsubscribe?: boolean
}

export const useSubscribe = <TokenType extends string | symbol>({
  token,
  handler,
  isUnsubscribe = false,
}: UseSubscriptionParams<TokenType>): UseSubscriptionResponse => {
  const internalHandler = (_: string, message: any) => {
    handler(token, message)
  }

  const unsubscribe = useCallback(() => {
    PubSub.unsubscribe(internalHandler)
  }, [])

  const resubscribe = useCallback(() => {
    PubSub.unsubscribe(internalHandler)
    PubSub.subscribe(token, internalHandler)
  }, [token])

  useEffect(() => {
    if (isUnsubscribe) {
      unsubscribe()
    } else {
      PubSub.subscribe(token, internalHandler)
    }

    return () => {
      unsubscribe()
    }
  }, [isUnsubscribe, token, unsubscribe])

  return { unsubscribe, resubscribe }
}
