# 01 — Internal pub/sub module API design

New module lives at `src/pubsub/index.ts` (the build globs pick it up; no
tsdown/tsconfig change needed). It exposes three things, layered from
"drop-in" to "modern":

1. **`PubSub`** — a lean singleton, backward-compatible with how the library
   re-exports it today. This is what the hooks use internally and what existing
   `import { PubSub } from 'use-pubsub-js'` consumers keep using.
2. **`createPubSub<EventMap>()`** — the *better* API: a typed factory (mitt /
   nanoevents style) so app code gets fully-typed channels instead of `any`.
3. **`on(token, handler, { signal? })`** — ergonomic subscribe that returns an
   unsubscribe function and supports `AbortSignal` (additive sugar).

## What the hooks actually require (the hard floor)

From the source, the hooks only need:

```ts
publish(token, data): boolean          // usePublish — drives lastPublish
subscribe(token, handler): Token       // useSubscribe — stored in a ref
unsubscribe(token): void               // useSubscribe — cleanup / isUnsubscribe
```

Plus `clearAllSubscriptions()` used by every test's `afterEach`.

## Proposed public surface

```ts
// src/pubsub/index.ts
export type Token = string

export type Listener<T = unknown> = (token: string, data: T) => void

export interface PubSubBus {
  /** async delivery via setTimeout(0); returns true iff >=1 subscriber. */
  publish<T = unknown>(token: string | symbol, data?: T): boolean
  /** returns an opaque string token to pass to unsubscribe(). */
  subscribe<T = unknown>(token: string | symbol, handler: Listener<T>): Token
  /** ergonomic: returns an unsubscribe fn; optional AbortSignal teardown. */
  on<T = unknown>(
    token: string | symbol,
    handler: Listener<T>,
    options?: { signal?: AbortSignal }
  ): () => void
  /** fires at most once, then auto-unsubscribes. */
  subscribeOnce<T = unknown>(token: string | symbol, handler: Listener<T>): Token
  /** unsubscribe by token, or by handler reference. */
  unsubscribe(value: Token | Listener): boolean
  clearAllSubscriptions(): void
}

export const PubSub: PubSubBus

// The typed "better" API
export type EventMap = Record<string | symbol, unknown>
export interface TypedPubSub<E extends EventMap> {
  publish<K extends keyof E>(token: K, data: E[K]): boolean
  subscribe<K extends keyof E>(token: K, handler: (token: K, data: E[K]) => void): Token
  on<K extends keyof E>(token: K, handler: (token: K, data: E[K]) => void, options?: { signal?: AbortSignal }): () => void
  subscribeOnce<K extends keyof E>(token: K, handler: (token: K, data: E[K]) => void): Token
  unsubscribe(value: Token | ((token: never, data: never) => void)): boolean
  clearAllSubscriptions(): void
}
export function createPubSub<E extends EventMap = EventMap>(): TypedPubSub<E>
```

`PubSub` is just `createPubSub()` with the default (untyped) event map, so there
is one implementation.

### Consumer usage (the typed win)

```ts
import { createPubSub } from 'use-pubsub-js/pubsub'

type AppEvents = {
  'user:login': { userId: string }
  'cart:update': { itemCount: number }
}
export const bus = createPubSub<AppEvents>()

bus.publish('user:login', { userId: '42' })          // payload type-checked
bus.subscribe('cart:update', (_t, data) => data.itemCount) // data: { itemCount: number }
```

## Mapping onto the hooks (no public hook-API change)

- `useSubscribe`: swap `import PubSub from 'pubsub-js'` → `import { PubSub } from '../pubsub'`.
  `subscriptionToken` ref stays `string | null` (subscribe returns a string token).
  The `Message = any` alias becomes `unknown` (see §types). Optionally add an
  additive second generic `Events` (defaulting to the untyped map) so callers
  *can* get typed handlers without any required change — **deferred to ideas**
  unless review wants it in v2.
- `usePublish`: swap the import only. `publish()` still returns `boolean`.
- `src/index.ts`: re-export `PubSub` (unchanged name) **plus** `createPubSub`
  and the types. Remove the `import PubSub from 'pubsub-js'`.

## Kept vs dropped vs decided (relative to pubsub-js)

**KEEP (required or low-cost, documented):**
- `publish` (async), `subscribe` (→ string token), `unsubscribe(token)`,
  `clearAllSubscriptions` — required by hooks/tests.
- `subscribeOnce` — cheap, commonly used, documented upstream.
- `unsubscribe(handler)` (by function reference) — cheap, common.
- Symbol tokens — the hook types accept `symbol` and a test verifies it.

**ADD (the "better API"):**
- `createPubSub<EventMap>()` typed factory.
- `on(token, handler, { signal })` → returns unsubscribe fn; `AbortSignal`
  teardown (one `AbortController.abort()` can cancel many subscriptions).

**DROP (unused internally, document in CHANGELOG):**
- Hierarchical/namespaced dotted-topic propagation (`a.b.c` → `a.b` → `a`).
  *Medium-risk drop* (pubsub-js documents it prominently). **Decision: drop**;
  call it out loudly in the migration notes. Re-add later only if requested.
- `publishSync` (the "here be dragons" sync path), `subscribeAll`/`*` wildcard,
  `clearSubscriptions(topic)`, `countSubscriptions`, `getSubscriptions`,
  `immediateExceptions`, `unsubscribe(topicString)` — niche/diagnostic.

## Behaviors that MUST match (verified by the contract tests)

1. **Async delivery** via `setTimeout(0)` — handler not called during `publish()`.
2. **`subscribe` returns a truthy string token**; `unsubscribe(token)` removes it.
3. **`publish` returns `false` when there are no subscribers** (drives `lastPublish`).
4. **Per-subscriber error isolation** — a throwing handler must not abort delivery
   to the others (pubsub-js re-throws async; we do the same).
5. **Snapshot subscribers before delivery** — subscribing/unsubscribing during a
   delivery must not corrupt the current dispatch.

## Decision: symbol handling — IDENTITY, not stringification

pubsub-js does `message.toString()`, so two *distinct* `Symbol('x')` collide
(both become `"Symbol(x)"`). **Decision: key subscriptions by the actual
`string | symbol` value (identity).** This removes a real footgun and is
strictly better; the existing Symbol test (same instance for sub+publish) still
passes. It is a **behavior difference** from pubsub-js for the (pathological)
same-description-different-instance case — documented as an intentional
improvement. *Flagged for review/maintainer in 07.*

## Implementation sketch

```ts
const channels = new Map<string | symbol, Map<Token, Listener>>()
let uid = 0

function subscribe(token, handler) {
  const id = `uid_${uid++}`
  let m = channels.get(token)
  if (!m) channels.set(token, (m = new Map()))
  m.set(id, handler)
  return id
}
function unsubscribe(value) {
  let removed = false
  for (const m of channels.values()) {
    if (typeof value === 'function') {
      for (const [id, fn] of m) if (fn === value) { m.delete(id); removed = true }
    } else if (m.delete(value)) removed = true
  }
  return removed
}
function publish(token, data) {
  const m = channels.get(token)
  if (!m || m.size === 0) return false
  const snapshot = [...m.values()]
  setTimeout(() => {
    for (const fn of snapshot) {
      try { fn(String(token), data) } catch (err) { setTimeout(() => { throw err }, 0) }
    }
  }, 0)
  return true
}
```

(`subscribeOnce`, `on`, `clearAllSubscriptions` build on these. Final code lives
behind the contract + parity tests.)
