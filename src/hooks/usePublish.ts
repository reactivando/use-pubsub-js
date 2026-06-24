import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type EventMap,
  PubSub,
  type PubSubBus,
  type TypedPubSub,
} from '../pubsub'
import { debounce } from '../utils/debounce'

export interface UsePublishResponse {
  lastPublish: boolean
  publish: () => void
}

export interface UsePublishParams<
  TokenType extends string | symbol,
  Events extends EventMap = EventMap,
> {
  /**
   * The bus to publish on. Defaults to the shared `PubSub` singleton; pass a
   * bus from `createPubSub<Events>()` for typed payloads. Keep the reference
   * stable (e.g. module scope) — changing it re-creates the publisher.
   */
  bus?: PubSubBus | TypedPubSub<Events>
  debounceMs?: number | string
  isAutomatic?: boolean
  isImmediate?: boolean
  isInitialPublish?: boolean
  message: TokenType extends keyof Events ? Events[TokenType] : unknown
  token: TokenType
}

export const usePublish = <
  TokenType extends string | symbol,
  Events extends EventMap = EventMap,
>({
  token,
  message,
  isAutomatic = false,
  isInitialPublish = false,
  isImmediate = false,
  debounceMs = 300,
  bus = PubSub,
}: UsePublishParams<TokenType, Events>): UsePublishResponse => {
  const activeBus = bus as PubSubBus
  const [lastPublish, setLastPublish] = useState(false)
  const didInitialPublish = useRef(false)

  const publish = useCallback(() => {
    const isPublished = activeBus.publish(token, message)

    setLastPublish(isPublished)
  }, [activeBus, token, message])

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
    // Skip auto-publish only for the "unset" sentinels (undefined/null/empty
    // string). Now that `message` is `unknown`, a plain truthiness check would
    // wrongly swallow valid falsy payloads like 0 or false.
    const hasMessage =
      message !== undefined && message !== null && message !== ''
    if (isAutomatic && hasMessage) {
      debouncedPublished()
    }
    return () => {
      debouncedPublished.clear()
    }
  }, [publish, isImmediate, isAutomatic, debounceMs, message])

  return useMemo(() => ({ lastPublish, publish }), [lastPublish, publish])
}
