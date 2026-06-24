# 06 — Ideas backlog (save for later / progressive enhancement)

Ideas worth keeping but not committing to v2.0.0 core. Each is tagged with the
version it depends on and how to ship it without breaking older users (the
maintainer's rule: *newer can use, older don't break*).

## React 19.2+ — `useEffectEvent` lane (R1)
Replace the latest-ref pattern in `useSubscribe` with `useEffectEvent` (stable
19.2). Ship as a **separate sub-path export** `use-pubsub-js/react19/useSubscribe`
(can't gate with a runtime `if` — Rules of Hooks). Default entry keeps the
React-17-safe implementation. Zero risk to existing users.
- Gating: sub-path export. Min React 19.2.
- Could land *in* v2.0.0 (additive) — see 07-Q3.

## Typed hooks via an optional `Events` generic
Give `useSubscribe`/`usePublish` an additive second generic
`Events extends EventMap = Record<string|symbol, unknown>` so callers can get
fully-typed handlers/payloads while existing call sites (one generic or none)
keep compiling. Pairs with `createPubSub`. Defaulting requires only TS 2.3+.
- Gating: none (purely additive types). Could be in v2 if review wants it;
  otherwise a minor v2.x.

## `useSyncExternalStore` — only if the bus gains readable state
Not applicable to a pure event bus (see 02). If a future "replay last value" /
BehaviorSubject mode is added, USES becomes the right integration (with
`getServerSnapshot` for SSR). Min React 18 (shim for 16+).

## React Compiler note
React Compiler v1.0 (Oct 2025) auto-memoizes; consumers who adopt it get the
return-object stability (02-§R3) for free. Nothing for us to do; mention in docs.

## Optional bus features (add only on request)
- `publishSync` — synchronous delivery (pubsub-js's "here be dragons"). Easy to
  add as a separate method; omitted by default to keep the surface lean & the
  async contract clear.
- `*` wildcard / `subscribeAll` — global listener (logging/devtools). Conflicts
  cleanly-typed event maps; omit unless needed.
- `once` at the module level — currently expressible via
  `on(t, h, { signal })` + `abort()` after first delivery, and `subscribeOnce`
  covers the common case.
- hierarchical/namespaced topics — the one notable dropped pubsub-js feature; if
  consumers ask, re-introduce behind an opt-in (e.g. a `createPubSub({ hierarchical: true })`).

## Performance micro-ideas (measure before doing)
- Avoid the delivery-time array snapshot allocation when a channel has a single
  subscriber (fast path).
- Consider a `Set`-backed channel if unsubscribe-by-handler becomes hot (trade
  off vs insertion-order guarantees).
These are negligible at this library's scale — only act with a benchmark.

## Tooling
- Optional `parity` CI job kept around (behind a flag) for any future bus rewrite.
- Re-evaluate `noBarrelFile`/exports lint once the default export is removed.
