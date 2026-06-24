import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PubSub } from '../pubsub'
import { debounce } from '../utils/debounce'

export interface UsePublishResponse {
  lastPublish: boolean
  publish: () => void
}

export interface UsePublishParams<TokenType extends string | symbol> {
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
}: UsePublishParams<TokenType>): UsePublishResponse => {
  const [lastPublish, setLastPublish] = useState(false)
  const didInitialPublish = useRef(false)

  const publish = useCallback(() => {
    const isPublished = PubSub.publish(token, message)

    setLastPublish(isPublished)
  }, [token, message])

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on mount when isInitialPublish is set; the empty dep array and the ref guard keep it single-fire even under StrictMode's double-invoke
  useEffect(() => {
    if (isInitialPublish && !didInitialPublish.current) {
      didInitialPublish.current = true
      publish()
    }
  }, [])

  useEffect(() => {
    const wait = Number.isFinite(+debounceMs) ? +debounceMs : 300
    const debouncedPublished = debounce(publish, wait, isImmediate)
    if (isAutomatic && message) {
      debouncedPublished()
    }
    return () => {
      debouncedPublished.clear()
    }
  }, [publish, isImmediate, isAutomatic, debounceMs, message])

  return useMemo(() => ({ lastPublish, publish }), [lastPublish, publish])
}
