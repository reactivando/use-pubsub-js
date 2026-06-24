import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type EventMap,
  PubSub,
  type PubSubBus,
  type TypedPubSub,
} from '../pubsub'
import { debounce } from '../utils/debounce'

export interface UsePublishResponse {
  /** `true` if the most recent publish reached at least one subscriber. */
  lastPublish: boolean
  /** Publish the current `message` to `token` on demand. */
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
  /** Debounce window (ms) for automatic publishing. Default `300`. */
  debounceMs?: number | string
  /** Re-publish automatically whenever `message` changes. Default `false`. */
  isAutomatic?: boolean
  /** With `isAutomatic`, publish on the leading edge (no debounce delay). */
  isImmediate?: boolean
  /** Publish once on mount. Default `false`. */
  isInitialPublish?: boolean
  /** Payload to publish; typed per-token when a typed bus is used. */
  message: TokenType extends keyof Events ? Events[TokenType] : unknown
  /** Topic to publish to. */
  token: TokenType
}

/**
 * Publish messages to a pub/sub topic from a component.
 *
 * @example
 * ```tsx
 * const { publish, lastPublish } = usePublish({ token: 'cart:add', message: item })
 * // automatic: re-publishes (debounced) whenever `message` changes
 * usePublish({ token: 'search', message: query, isAutomatic: true })
 * ```
 */
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
