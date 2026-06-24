import PubSub from 'pubsub-js'
import { useCallback, useEffect, useState } from 'react'
import { debounce } from '../utils/debounce'

export interface IUsePublishResponse {
  lastPublish: boolean
  publish: () => void
}

export interface IUsePublishParams<TokenType extends string | symbol> {
  debounceMs?: number | string
  isAutomatic?: boolean
  isImmediate?: boolean
  isInitialPublish?: boolean
  message: string
  token: TokenType
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on mount when isInitialPublish is set; the empty dep array is intentional
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
  }, [publish, isImmediate, isAutomatic, debounceMs, message])

  return { lastPublish, publish }
}
