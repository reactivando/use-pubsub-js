import { useEffect, useCallback, useState } from 'react'
import PubSub from 'pubsub-js'
import { debounce } from '../utils/debounce'

export interface IUsePublishResponse {
  lastPublish: boolean
  publish: () => void
}

export interface IUsePublishParams<TokenType extends string | symbol> {
  token: TokenType
  message: string
  isAutomatic?: boolean
  isInitialPublish?: boolean
  isImmediate?: boolean
  debounceMs?: number | string
}

export const usePublish = <TokenType extends string | symbol>({
  token,
  message,
  isAutomatic = false,
  isInitialPublish = false,
  isImmediate = false,
  debounceMs = 300,
}: IUsePublishParams<TokenType>): IUsePublishResponse => {
  const [lastPublish, setLastPublish] = useState(false)

  const publish = useCallback(() => {
    const isPublished = PubSub.publish(token, message)

    setLastPublish(isPublished)
  }, [token, message])

  useEffect(() => {
    if (isInitialPublish) {
      publish()
    }
  }, [])

  useEffect(() => {
    const debouncedPublished = debounce(publish, +debounceMs, isImmediate)
    if (isAutomatic && message) {
      debouncedPublished()
    }
    return () => {
      debouncedPublished.clear()
    }
  }, [publish, isImmediate, isAutomatic, debounceMs])

  return { lastPublish, publish }
}
