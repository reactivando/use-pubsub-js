# 09 — Persona-lens verdicts, locked API, and M1 implementation spec

Four persona lenses (API/DX, TypeScript types, performance/correctness,
release-risk) critiqued the round-2 design. **All four returned GO-WITH-CHANGES.**
The changes are M1 implementation refinements + doc fixes — **none block M0**.
This doc is authoritative for the API shape and the M1 internal implementation.

## Locked API (v2.0.0)

- **Hierarchical × typed → option (i).** `createPubSub<E extends EventMap>()`
  returns a **flat** typed bus (exact-key matching, exact payload types). The
  default **`PubSub` singleton is untyped + hierarchical** (dotted ancestor
  propagation) — satisfies the locked "hierarchical as default" decision without
  the type-lie. The richer `HierarchicalPubSub<E>` (types lens's option iv) is
  **reserved for v2.1** (additive).
- **Public methods:** `publish`, `subscribe`(→ string token), `unsubscribe`,
  `on`(→ unsubscribe fn, `{ signal? }`), `subscribeOnce`, `clearAllSubscriptions`.
  Docs lead with **`on`/`subscribeOnce`** (modern); `subscribe`/`unsubscribe(token)`
  are kept for pubsub-js drop-in compat (and used by the hooks). `clearAllSubscriptions`
  documented as global (test/teardown use).
- **`unsubscribe` signature:** `unsubscribe(value: string | ((...args: never[]) => unknown)): boolean`
  (per types lens — not the `(never,never)=>void` form).
- **Delivery:** async `setTimeout(0)`; handler receives the **original** token
  (`string | symbol`) — `Listener<T> = (token: string | symbol, data: T) => void`.
- **Hooks (v2.0.0):** only minimal changes — `useSubscribe` handler payload
  `any → unknown`; `useMemo` both hook return objects (V3). The optional `bus`
  param + `Events` generic + `usePublish` `message→data` rename are **reserved as
  additive v2.1** (designed so they don't break later). Keeps v2 hook churn small.

## M1 internal implementation spec (reference)

Data structure: a forward index + a reverse index (perf lens).

```ts
const channels = new Map<string | symbol, Map<string, Listener>>()
const tokenToChannel = new Map<string, string | symbol>()   // O(1) unsubscribe(token)
let uid = 0
```

Rules (must-fixes from the perf lens, all internal):
1. **Snapshot synchronously in `publish()`** — snapshot every hierarchy level's
   subscribers *before* `setTimeout`, never inside the delivery callback. (Avoids
   the unsubscribe-between-publish-and-delivery corruption.)
2. **`publish` returns `false` if no subscriber exists at the token OR any
   ancestor** (walk ancestors for the has-any check too).
3. **Hierarchical walk (string tokens only):** notify exact token, then each
   ancestor (`a.b.c` → `a.b` → `a`), closest-first. Symbols: identity only, no
   hierarchy. Deliver the **original** published token to every handler (matches
   pubsub-js; a handler subscribed at `a` receiving an `a.b.c` publish gets
   `a.b.c`). A handler subscribed at multiple levels fires once per level
   (documented, tested).
4. **`unsubscribe(token)` O(1)** via `tokenToChannel`; `unsubscribe(handler)`
   scans (rare). After removal, **delete the channel Map entry when empty**
   (prevents strong-ref retention of symbol keys).
5. **`subscribeOnce`** wrapper calls `unsubscribe(id)` **before** invoking the
   handler (no leak if it throws).
6. **`on(token, handler, { signal })`** returns a `cleanup` fn that both
   unsubscribes and `removeEventListener('abort', cleanup)`; register the abort
   listener with `{ once: true }`. (No listener leak on manual unsubscribe.)
7. **Error isolation:** `try { fn(token, data) } catch (e) { setTimeout(() => { throw e }, 0) }`.
8. **`clearAllSubscriptions()`:** `channels.clear(); tokenToChannel.clear()`.

Reference `publish`:
```ts
function publish(token, data) {
  const toNotify = [token]
  if (typeof token === 'string') {
    let t = token, pos
    while ((pos = t.lastIndexOf('.')) !== -1) { t = t.slice(0, pos); toNotify.push(t) }
  }
  if (!toNotify.some(t => (channels.get(t)?.size ?? 0) > 0)) return false
  const snapshots = []
  for (const t of toNotify) { const m = channels.get(t); if (m?.size) snapshots.push([...m.values()]) }
  setTimeout(() => {
    for (const fns of snapshots) for (const fn of fns) {
      try { fn(token, data) } catch (e) { setTimeout(() => { throw e }, 0) }
    }
  }, 0)
  return true
}
```

## M0/M1 test additions driven by the lenses
- ancestor-delivery **order** (exact before ancestors);
- **multi-level dedup** behavior (handler subscribed at `a` and `a.b` fires twice
  for `a.b.c`) — documented + tested;
- error-isolation test must **flush timers twice** (the rethrow is itself a faked
  `setTimeout`) or assert via a `setTimeout` spy;
- symbol-identity (two `Symbol('x')` don't cross-deliver) — `it.todo` in M0
  (fails vs pubsub-js), active on the module in M1;
- the existing perf-lens cases (no-data publish, double-unsubscribe, cross-publish
  ordering, snapshot/handler-added-during-dispatch, unsubscribe return shape).

## Pre-M0 doc fixes (applied)
1. `milestones.yml`: `Message any→unknown` is **M4**, not M2.
2. Hierarchical×typed decision (option i) written into 07.
3. Hierarchical-propagation contract tests added to **M0** (pubsub-js supports
   them today → they pass against the current backend).
4. **M3 folded into M2** (R6 dropped; the only v2 React change, `useMemo`, lives
   with the swap).

## Verdicts (one line each)
- API/DX: GO-WITH-CHANGES — collapse duality toward `on`/`once`; flat typed bus.
- Types: GO-WITH-CHANGES — option (i) sound; fix `unsubscribe` type; reserve generics.
- Performance: GO-WITH-CHANGES — 8 internal must-fixes above; architecture sound.
- Risk: GO — start M0 after the 4 doc fixes; biggest residual = decide hierarchical×typed (now done).
