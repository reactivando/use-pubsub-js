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

export type Token = string

export type Listener<T = unknown> = (token: string | symbol, data: T) => void

export type EventMap = Record<string | symbol, unknown>

/** Untyped, optionally-hierarchical bus (the `PubSub` singleton shape). */
export interface PubSubBus {
  clearAllSubscriptions(): void
  on<T = unknown>(
    token: string | symbol,
    handler: Listener<T>,
    options?: { signal?: AbortSignal },
  ): () => void
  publish<T = unknown>(token: string | symbol, data?: T): boolean
  subscribe<T = unknown>(token: string | symbol, handler: Listener<T>): Token
  subscribeOnce<T = unknown>(
    token: string | symbol,
    handler: Listener<T>,
  ): Token
  unsubscribe(value: Token | ((...args: never[]) => unknown)): boolean
}

/** Flat, fully-typed bus created by `createPubSub<EventMap>()`. */
export interface TypedPubSub<E extends EventMap> {
  clearAllSubscriptions(): void
  on<K extends keyof E>(
    token: K,
    handler: (token: K, data: E[K]) => void,
    options?: { signal?: AbortSignal },
  ): () => void
  publish<K extends keyof E>(token: K, data: E[K]): boolean
  subscribe<K extends keyof E>(
    token: K,
    handler: (token: K, data: E[K]) => void,
  ): Token
  subscribeOnce<K extends keyof E>(
    token: K,
    handler: (token: K, data: E[K]) => void,
  ): Token
  unsubscribe(value: Token | ((...args: never[]) => unknown)): boolean
}

type AnyListener = Listener<unknown>

const createBus = ({ hierarchical = false } = {}): PubSubBus => {
  const channels = new Map<string | symbol, Map<Token, AnyListener>>()
  const tokenToChannel = new Map<Token, string | symbol>()
  let uid = 0

  const subscribe = <T>(
    token: string | symbol,
    handler: Listener<T>,
  ): Token => {
    const id = `uid_${uid++}`
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
    const targets = targetsFor(token)
    // Snapshot every target level synchronously, before scheduling delivery,
    // so subscribe/unsubscribe during the wait can't corrupt this dispatch.
    const snapshots: AnyListener[][] = []
    for (const target of targets) {
      const channel = channels.get(target)
      if (channel && channel.size > 0) {
        snapshots.push([...channel.values()])
      }
    }
    if (snapshots.length === 0) {
      return false
    }
    setTimeout(() => {
      for (const handlers of snapshots) {
        for (const handler of handlers) {
          try {
            handler(token, data)
          } catch (error) {
            // Isolate: a throwing subscriber must not stop the rest. Re-throw
            // asynchronously so it surfaces without aborting delivery.
            setTimeout(() => {
              throw error
            }, 0)
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

  const clearAllSubscriptions = (): void => {
    channels.clear()
    tokenToChannel.clear()
  }

  return {
    publish,
    subscribe,
    on,
    subscribeOnce,
    unsubscribe,
    clearAllSubscriptions,
  }
}

/** Create a flat, typed bus for an event map. */
export const createPubSub = <E extends EventMap = EventMap>(): TypedPubSub<E> =>
  createBus({ hierarchical: false }) as unknown as TypedPubSub<E>

/** The default shared bus: untyped payloads, hierarchical dotted topics. */
export const PubSub: PubSubBus = createBus({ hierarchical: true })
