// Internal, dependency-free pub/sub bus (replaces pubsub-js in v2).
//
// Two public shapes:
//  - `PubSub`: the default singleton — untyped payloads, HIERARCHICAL dotted
//    topics (publishing `a.b.c` also notifies `a.b` and `a`).
//  - `createPubSub<EventMap>()`: a FLAT, typed bus (exact-key matching).
//
// Delivery is asynchronous via setTimeout(0); subscribers are snapshotted at
// publish time; a throwing subscriber never aborts delivery to the others.
// Symbol tokens are matched by identity (no stringification, no hierarchy).

declare const subscriptionTokenBrand: unique symbol

/**
 * Opaque handle returned by `subscribe`/`subscribeOnce`. Pass it to
 * `unsubscribe`. It is a branded `string`, so an arbitrary string (e.g. a topic
 * name passed by mistake) is rejected at compile time.
 */
export type SubscriptionToken = string & {
  readonly [subscriptionTokenBrand]: typeof subscriptionTokenBrand
}

/** @deprecated Renamed to {@link SubscriptionToken}. */
export type Token = SubscriptionToken

export type Listener<T = unknown> = (token: string | symbol, data: T) => void

export type EventMap = Record<string | symbol, unknown>

/** Untyped, optionally-hierarchical bus (the `PubSub` singleton shape). */
export interface PubSubBus {
  /** Remove every subscription (and retained values, if any). */
  clearAllSubscriptions(): void
  /**
   * The last value published to `token`, or `undefined`. Only retains values
   * when the bus was created with `{ retained: true }` (powers `useBusState`).
   */
  getSnapshot<T = unknown>(token: string | symbol): T | undefined
  /**
   * Subscribe and get back a cleanup function (preferred for new code). Pass an
   * `AbortSignal` to auto-unsubscribe when it aborts.
   */
  on<T = unknown>(
    token: string | symbol,
    handler: Listener<T>,
    options?: { signal?: AbortSignal },
  ): () => void
  /**
   * Publish `data` to `token`. Delivery is async; returns `true` if at least one
   * subscriber was registered at publish time, `false` otherwise.
   */
  publish<T = unknown>(token: string | symbol, data?: T): boolean
  /** Subscribe and get back a token to pass to {@link PubSubBus.unsubscribe}. */
  subscribe<T = unknown>(
    token: string | symbol,
    handler: Listener<T>,
  ): SubscriptionToken
  /** Subscribe for a single delivery, then auto-unsubscribe. */
  subscribeOnce<T = unknown>(
    token: string | symbol,
    handler: Listener<T>,
  ): SubscriptionToken
  /** Unsubscribe by the token from `subscribe`/`subscribeOnce`, or by handler reference. */
  unsubscribe(
    value: SubscriptionToken | ((...args: never[]) => unknown),
  ): boolean
}

/** Flat, fully-typed bus created by `createPubSub<EventMap>()`. */
export interface TypedPubSub<E extends EventMap> {
  clearAllSubscriptions(): void
  /**
   * The last value published to `token`, or `undefined`. Only retains values
   * when the bus was created with `{ retained: true }` (powers `useBusState`).
   */
  getSnapshot<K extends keyof E>(token: K): E[K] | undefined
  on<K extends keyof E>(
    token: K,
    handler: (token: K, data: E[K]) => void,
    options?: { signal?: AbortSignal },
  ): () => void
  publish<K extends keyof E>(token: K, data: E[K]): boolean
  subscribe<K extends keyof E>(
    token: K,
    handler: (token: K, data: E[K]) => void,
  ): SubscriptionToken
  subscribeOnce<K extends keyof E>(
    token: K,
    handler: (token: K, data: E[K]) => void,
  ): SubscriptionToken
  unsubscribe(
    value: SubscriptionToken | ((...args: never[]) => unknown),
  ): boolean
}

type AnyListener = Listener<unknown>

/** Invoked when a subscriber throws during delivery. */
export type ErrorHandler = (error: unknown) => void

const defaultOnError: ErrorHandler = error => {
  // Surface the error without aborting delivery or crashing the host. The
  // pre-2.0 behavior re-threw via setTimeout, which terminates a Node process
  // when no uncaughtException handler is registered; console.error is safe in
  // both Node and the browser. Pass a custom `onError` to override.
  console.error('[use-pubsub-js] a subscriber threw during delivery:', error)
}

const createBus = ({
  hierarchical = false,
  retained = false,
  onError = defaultOnError,
}: {
  hierarchical?: boolean
  retained?: boolean
  onError?: ErrorHandler
} = {}): PubSubBus => {
  const channels = new Map<string | symbol, Map<Token, AnyListener>>()
  const tokenToChannel = new Map<Token, string | symbol>()
  // Last published value per exact token, kept only in retained mode.
  const lastValues = retained ? new Map<string | symbol, unknown>() : null
  let uid = 0

  const subscribe = <T>(
    token: string | symbol,
    handler: Listener<T>,
  ): Token => {
    const id = `uid_${uid++}` as SubscriptionToken
    let channel = channels.get(token)
    if (!channel) {
      channel = new Map()
      channels.set(token, channel)
    }
    channel.set(id, handler as AnyListener)
    tokenToChannel.set(id, token)
    return id
  }

  const removeById = (id: Token): boolean => {
    const topic = tokenToChannel.get(id)
    if (topic === undefined) {
      return false
    }
    // biome-ignore lint/style/noNonNullAssertion: channel always exists for a known token (tokenToChannel<->channels invariant)
    const channel = channels.get(topic)!
    const removed = channel.delete(id)
    tokenToChannel.delete(id)
    if (channel.size === 0) {
      channels.delete(topic)
    }
    return removed
  }

  const unsubscribe = (
    value: Token | ((...args: never[]) => unknown),
  ): boolean => {
    if (typeof value === 'function') {
      let removed = false
      for (const [topic, channel] of channels) {
        for (const [id, handler] of channel) {
          if (handler === value) {
            channel.delete(id)
            tokenToChannel.delete(id)
            removed = true
          }
        }
        if (channel.size === 0) {
          channels.delete(topic)
        }
      }
      return removed
    }
    return removeById(value)
  }

  // For a string token on a hierarchical bus: the token plus each dotted
  // ancestor, closest first. Otherwise: just the exact token.
  const targetsFor = (token: string | symbol): (string | symbol)[] => {
    if (!hierarchical || typeof token !== 'string') {
      return [token]
    }
    const targets: (string | symbol)[] = [token]
    let topic = token
    let dot = topic.lastIndexOf('.')
    while (dot !== -1) {
      topic = topic.slice(0, dot)
      targets.push(topic)
      dot = topic.lastIndexOf('.')
    }
    return targets
  }

  const publish = <T>(token: string | symbol, data?: T): boolean => {
    // Retain the latest value per exact token (for getSnapshot/useBusState),
    // independent of whether anyone is currently subscribed.
    lastValues?.set(token, data)
    const targets = targetsFor(token)
    // Snapshot subscribers synchronously, before scheduling delivery, so
    // subscribe/unsubscribe during the wait can't corrupt this dispatch. One
    // flat array preserves delivery order (exact topic first, then ancestors;
    // subscription order within each) while avoiding an array-per-level alloc.
    const snapshot: AnyListener[] = []
    for (const target of targets) {
      const channel = channels.get(target)
      if (channel) {
        for (const handler of channel.values()) {
          snapshot.push(handler)
        }
      }
    }
    if (snapshot.length === 0) {
      return false
    }
    setTimeout(() => {
      for (const handler of snapshot) {
        try {
          handler(token, data)
        } catch (error) {
          // Isolate: a throwing subscriber must not stop the rest, and must not
          // crash the host. Hand the error to onError (default: console.error)
          // instead of re-throwing. Guard onError itself so a throwing handler
          // can't re-introduce the uncaught-exception crash.
          try {
            onError(error)
          } catch {
            // onError threw; swallow to preserve delivery isolation.
          }
        }
      }
    }, 0)
    return true
  }

  const on = <T>(
    token: string | symbol,
    handler: Listener<T>,
    options?: { signal?: AbortSignal },
  ): (() => void) => {
    const id = subscribe(token, handler)
    const cleanup = () => {
      removeById(id)
      options?.signal?.removeEventListener('abort', cleanup)
    }
    if (options?.signal) {
      if (options.signal.aborted) {
        removeById(id)
      } else {
        options.signal.addEventListener('abort', cleanup, { once: true })
      }
    }
    return cleanup
  }

  const subscribeOnce = <T>(
    token: string | symbol,
    handler: Listener<T>,
  ): Token => {
    // `fired` guards the case where two publishes in the same tick both
    // snapshot this wrapper before the first delivery removes it — without it
    // the handler would run twice. Unsubscribe before invoking so a throwing
    // handler can't leak the subscription.
    let fired = false
    const id = subscribe(token, (deliveredToken, data) => {
      if (fired) {
        return
      }
      fired = true
      removeById(id)
      handler(deliveredToken, data as T)
    })
    return id
  }

  const getSnapshot = <T>(token: string | symbol): T | undefined =>
    lastValues?.get(token) as T | undefined

  const clearAllSubscriptions = (): void => {
    channels.clear()
    tokenToChannel.clear()
    lastValues?.clear()
  }

  return {
    publish,
    subscribe,
    on,
    subscribeOnce,
    unsubscribe,
    getSnapshot,
    clearAllSubscriptions,
  }
}

/**
 * Create a flat, typed bus for an event map.
 *
 * @param options.onError - called when a subscriber throws during delivery;
 * defaults to `console.error`. Delivery to other subscribers always continues.
 * @param options.retained - when true, the bus keeps the last value published to
 * each token so `getSnapshot(token)` (and `useBusState`) can read it. Off by
 * default to avoid unbounded growth for dynamic topic sets.
 */
export const createPubSub = <E extends EventMap = EventMap>(options?: {
  onError?: ErrorHandler
  retained?: boolean
}): TypedPubSub<E> =>
  createBus({
    hierarchical: false,
    retained: options?.retained,
    onError: options?.onError,
  }) as unknown as TypedPubSub<E>

// The package sets `sideEffects: false`, so a bundler may tree-shake this
// singleton for consumers that only import `createPubSub`. (A `/*#__PURE__*/`
// annotation here is stripped by minification, so it would be a no-op.)
/** The default shared bus: untyped payloads, hierarchical dotted topics. */
export const PubSub: PubSubBus = createBus({ hierarchical: true })
