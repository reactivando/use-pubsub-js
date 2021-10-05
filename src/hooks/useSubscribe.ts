import { useEffect, useCallback } from 'react'
import PubSub from 'pubsub-js'

export interface UseSubscriptionResponse {
  unsubscribe: () => void
  resubscribe: () => void
}

export interface UseSubscriptionParams {
  token: string | symbol
  handler: (token?: string | symbol, message?: string) => void
  isUnsubscribe?: boolean
}

export const useSubscribe = ({
  token,
  handler,
  isUnsubscribe = false,
}: UseSubscriptionParams): UseSubscriptionResponse => {
  const unsubscribe = useCallback(() => {
    PubSub.unsubscribe(token)
  }, [token])

  const resubscribe = useCallback(() => {
    PubSub.unsubscribe(token)

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
