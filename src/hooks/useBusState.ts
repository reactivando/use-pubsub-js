import { useCallback, useRef, useSyncExternalStore } from 'react'
import {
  type EventMap,
  PubSub,
  type PubSubBus,
  type TypedPubSub,
} from '../pubsub'

export interface UseBusStateParams<
  TokenType extends string | symbol,
  Events extends EventMap = EventMap,
> {
  /**
   * The bus to read from. Defaults to the shared `PubSub` singleton. For the
   * value to be available on first render (before any publish this session),
   * create the bus with `createPubSub({ retained: true })`.
   */
  bus?: PubSubBus | TypedPubSub<Events>
  /** Returned until a value is available for `token`. */
  initialValue: TokenType extends keyof Events ? Events[TokenType] : unknown
  token: TokenType
}

/**
 * Subscribe to a topic and read its latest value as React state, via
 * `useSyncExternalStore` (tear-free under concurrent rendering, SSR-safe).
 *
 * On a `retained` bus the latest published value is available immediately on
 * mount; on any bus, values published while mounted update the returned state.
 */
export const useBusState = <
  TokenType extends string | symbol,
  Events extends EventMap = EventMap,
>({
  token,
  initialValue,
  bus = PubSub,
}: UseBusStateParams<TokenType, Events>): TokenType extends keyof Events
  ? Events[TokenType]
  : unknown => {
  type Value = TokenType extends keyof Events ? Events[TokenType] : unknown
  const activeBus = bus as PubSubBus
  // Capture the initial value once so getSnapshot stays referentially stable.
  const initialRef = useRef(initialValue)
  // Track values published while mounted, so the hook works on a non-retained
  // bus too (a retained bus is read directly and takes precedence).
  const latestRef = useRef<Value | undefined>(undefined)

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      activeBus.on(token, (_deliveredToken, data) => {
        latestRef.current = data as Value
        onStoreChange()
      }),
    [activeBus, token],
  )

  const getSnapshot = useCallback((): Value => {
    const fromBus = activeBus.getSnapshot<Value>(token)
    if (fromBus !== undefined) {
      return fromBus
    }
    if (latestRef.current !== undefined) {
      return latestRef.current
    }
    return initialRef.current as Value
  }, [activeBus, token])

  const getServerSnapshot = useCallback(
    (): Value => initialRef.current as Value,
    [],
  )

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
