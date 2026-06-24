# 08 — Adversarial review verdicts & plan amendments

Three adversarial reviewers (API/architecture, testing/safety, React correctness)
challenged the plan. Each challenge below has my **verdict** (I adjudicated;
some I verified directly against the code). **This doc is authoritative where it
conflicts with 01–07** — accepted items are the plan of record.

## Accepted — BLOCKERS (verified)

### V1 — `example/` app breaks silently in v2 (was entirely missed)
Verified: `example/src/service/publish.ts` does `import PubSub from 'pubsub-js'`,
and `example/package.json` does **not** list `pubsub-js` — it only resolves today
via hoisting from the root's runtime dep. Removing the dep in v2 breaks the
example, and CI installs the example but never **builds** it.
- **Amendment:** in **M2**, change that import to `import { PubSub } from 'use-pubsub-js'`
  (use the library's own bus). Add `pnpm --prefix ./example build` as a real CI
  gate (it currently isn't built anywhere). Drop the example's now-unneeded
  `@types/pubsub-js`.

### V2 — `String(token)` delivery contradicts identity-keying & the typed API
Verified: the symbol test only asserts `calls[0][1]` (data), and the hook does
`handlerRef.current(msg as TokenType, data)` on a **stringified** token — so a
`symbol` subscriber's handler receives `"Symbol(x)"` today, and `as TokenType`
is a type-lie. My 01 sketch (`fn(String(token), data)`) carried this forward and
would make the new `TypedPubSub<E>` handler types contradict runtime.
- **Amendment:** deliver the **original** token: `fn(token, data)`; `Listener<T>`
  becomes `(token: string | symbol, data: T) => void`. Add assertions on
  `calls[0][0]` for both a string and a symbol token. This makes the hook's
  `as TokenType` truthful. It is an intentional, documented behavior improvement
  (handlers now receive the real symbol, not its string form).

### V3 — Memoize the hooks' return objects (don't just "document destructuring")
The returned `{ unsubscribe, resubscribe }` / `{ lastPublish, publish }` are new
objects each render. `eslint-plugin-react-hooks/exhaustive-deps` pushes consumers
to put the whole object in a dep array → infinite `useEffect` loop. Documentation
won't prevent it.
- **Amendment:** `useMemo` both hook return objects in **v2 core** (the inner
  fns are already `useCallback`-stable, so it's behavior-neutral and cheap).
  Supersedes 02-§R3's "document only".

### V4 — e2e smoke is behavioral-zero and must be written early
Current e2e only asserts exports are defined. The plan assumed the runtime
extension; it isn't written, and `ci.yml` doesn't run e2e at all (only
`e2e-test.yml` on PRs).
- **Amendment:** write the runtime smoke (subscribe→publish→`await` ~10ms→assert
  handler fired with `(token, data)`; assert `createPubSub` exists and the
  default export is `undefined`) in **M1/M2**, CJS+ESM, with real-timer-robust
  delay. Not deferred to M5/M6.

## Accepted — STRONG

- **V5 (testing#4): coverage thresholds → M1, not M6.** Enforce 100% on
  `src/pubsub/**` the moment the module lands; otherwise M1–M5 run ungated.
- **V6 (testing#3): circular oracle.** After repointing specs to the internal
  singleton, hook tests use the module as both subject and oracle. Keep
  `src/pubsub/pubsub.spec.ts` as the **permanent** independent module test, and
  add `vi.spyOn(PubSub, 'publish')`-style assertions in hook tests where they add
  signal independent of the bus round-trip.
- **V7 (testing#5): add missing contract cases.** publish with **no data**
  (`publish(token)` → handler gets `(token, undefined)`, returns true);
  **double-unsubscribe** (2nd returns false, no throw); **cross-publish ordering**
  (two `publish()` in one tick deliver A-then-B); **handler added during
  dispatch** must not fire in the current dispatch (snapshot); assert
  `unsubscribe`'s **return shape** (boolean). Add to MUST-HAVE.
- **V8 (testing#1): symbol-identity baseline gap.** It can't pass against
  pubsub-js, so land it in **M0 as `it.todo`/`skip`** (visible gap) and activate
  on the internal module in M1/M2 — plus the V2 token-arg assertions.
- **V9 (API#3 / testing#2): `subscribe` vs `on`; `subscribeOnce` return.**
  `subscribe` (→ string token) is the **hook-internal/compat** path; new consumer
  code should prefer `on` (→ unsubscribe fn). Mark `subscribe` `@internal` in
  JSDoc. `subscribeOnce` returns a token (diverges from pubsub-js which returns
  the bus) — document the divergence; do not claim it in "parity".
- **V10 (testing#2): parity test is thin.** It can only cover the shared,
  non-divergent surface (already covered by the contract suite). Keep it, but
  every exclusion (symbol identity, dropped hierarchical, `subscribeOnce` return)
  must be commented and linked to the non-parity test that covers it. Treat
  parity as a *secondary* cross-check, not the primary safety net (the contract +
  module specs are primary).
- **V11 (API#8): `Message: any → unknown` moves to M4** (with the other
  type-breaking changes) so "M4 = all breaking type changes" holds.

## Accepted — MINOR

- **V12 (API#7):** type `unsubscribe` with a real union, not the `(token: never,
  data: never)` bottom-function trick.
- **V13 (API#9):** add a negative test asserting the **default export is
  `undefined`** after removal.
- **V14 (testing#8):** standardize new spec files on
  `beforeEach(vi.useFakeTimers)`/`afterEach(vi.useRealTimers)`; optionally align
  the existing hook specs (cheap) to avoid cross-file timer-state leak.
- **V15 (testing#9):** e2e smoke must import/assert the **new named exports**
  (`createPubSub`) to cover the barrel re-export wiring (`src/index.ts` is
  coverage-excluded).

## Modified — R6 downgraded (React reviewer was right)

- **V16 (React#1/#2): drop the `useLayoutEffect` swap (R6).** With `setTimeout(0)`
  delivery the stale-handler window is unreachable (the existing "handler
  changes" test proves `useEffect` works), and `useLayoutEffect` adds SSR/layout
  cost for no observable gain. **Decision: leave the handler-ref `useEffect`
  as-is in v2 core** (don't touch a working hook). Record the **render-time ref
  write** (`handlerRef.current = handler` during render) and `useEffectEvent`
  (19.2) as ideas (06); the render-time write is the preferred future
  simplification if we ever touch it. So v2 core's only React change is **V3**
  (memoize returns).

## Elevated to the maintainer (genuine product decisions)

- **V17 (API#1): `createPubSub` is disconnected from the hooks.** `PubSub` is
  `createPubSub()` once at module scope; a consumer's `createPubSub<AppEvents>()`
  is a **separate bus** the hooks don't use — a real footgun. Options (new Q7/Q8
  in 07):
  - **(a)** Defer `createPubSub` to v2.1; ship v2.0.0 as a clean dep-swap with the
    lean `PubSub` + `on` only. (Smallest, safest.)
  - **(b)** Ship `createPubSub` **and** add an optional `bus` param to the hooks
    (`useSubscribe({ token, handler, bus? })`, default = singleton) so a typed bus
    integrates end-to-end — the genuinely useful version. (Additive hook-API
    change; more scope.)
  - **(c)** Ship `createPubSub` standalone with very explicit "separate bus" docs.
- **V18 (API#4 / Q1): hierarchical topics.** Dropping them is a *silent* runtime
  break (handler never fires, no error) for consumers who used dotted topics from
  the upstream docs. Either ship an opt-in `createPubSub({ hierarchical: true })`
  **in v2.0.0** (small: ancestor-walk on publish) or accept the drop with a loud
  CHANGELOG. **Maintainer's call (Q1).**

## Upheld rejections (reviewers agreed)

- `useSyncExternalStore`: not a fit for a push-event hook (all three implicitly
  or explicitly agreed). Revisit only if the bus gains readable last-value state.
- React 19 `use`: not applicable.

## Noted (no action, recorded)

- StrictMode unmount→remount window and `resubscribe` dep-array redundancy
  (React#6/#7) are pre-existing and benign (delivery is a macrotask after
  commit); left untouched, not claimed as "no risk" anymore.
- `@types/react@19` type-shape differences would matter for a future `react19`
  sub-path (06).

## Round-2 maintainer decisions (LOCKED)

- **Q1 → KEEP hierarchical topics as DEFAULT.** Replicate pubsub-js's dotted
  ancestor propagation (`publish('a.b.c')` notifies `a.b.c`, `a.b`, `a`) in the
  default bus. This *removes* the silent-break risk (maximally compatible) but
  adds scope and a design tension (below). Symbols match by **identity** (no
  hierarchy); only string tokens get dotted propagation. Parity tests can now
  cover hierarchical behavior (we match pubsub-js). Contract/module tests MUST
  add ancestor-propagation cases.
- **Q7 → DO NOT defer `createPubSub`.** Ship the typed API in v2.0.0. The
  integration design (standalone vs hooks accept an optional `bus`) is delegated
  to a **persona-lens critique round** (below) to recommend; then implement.
- **Q8 → symbol delivery improvement confirmed** (handlers receive the original
  symbol).

### New design tension to resolve in the critique (hierarchical × typed)
A typed `createPubSub<EventMap>()` keyed by exact `keyof E` does not naturally
model hierarchical propagation: a subscriber to `'a'` typed as `E['a']` may now
receive payloads published to `'a.b.c'` (type `E['a.b.c']`). Options to weigh:
(i) hierarchical only on the untyped default `PubSub`, typed `createPubSub` stays
flat; (ii) typed API models a parent payload as a union of descendants; (iii)
hierarchical is a per-bus option `createPubSub({ hierarchical })` with relaxed
(`unknown`) payloads for ancestor delivery. The critique recommends.

## Net effect on the milestones
See the updated 05/`milestones.yml`: example fix + build gate and the e2e smoke
move into **M2/M1**; coverage thresholds into **M1**; `Message:any→unknown` into
**M4**; the new contract cases into **M0/M1**; R6 removed; V3 `useMemo` added to
the React milestone; Q1/Q7/Q8 block final API lock-in.
