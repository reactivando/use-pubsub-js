import { useEffect, useCallback, useRef } from 'react'
import PubSub from 'pubsub-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Message = any

export interface UseSubscriptionResponse {
  unsubscribe: () => void
  resubscribe: () => void
}

export interface UseSubscriptionParams<TokenType extends string | symbol> {
  token: TokenType
  handler: (token: TokenType, message: Message) => void
  isUnsubscribe?: boolean
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

  const internalHandler = useCallback(
    (msg: string, data: Message) => {
      handlerRef.current(msg as TokenType, data)
    },
    [],
  )

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

  useEffect(() => {
    if (!isUnsubscribe) {
      resubscribe()
    } else {
      unsubscribe()
    }
    return unsubscribe
  }, [isUnsubscribe, token, resubscribe, unsubscribe])

  return { unsubscribe, resubscribe }
}
