# 07 — Decision log, open questions, risks

## Decision log (decided in this plan; challengeable in review)

- **D1 — API shape:** ship a lean compatible `PubSub` singleton **and** a typed
  `createPubSub<EventMap>()` factory **and** an `on(token, handler, { signal })`
  sugar. Best of "lean" + "better". (01)
- **D2 — keep:** `publish`(async), `subscribe`(→string token), `unsubscribe(token
  |handler)`, `subscribeOnce`, `clearAllSubscriptions`. **drop:** hierarchical
  topics, `publishSync`, wildcard/`subscribeAll`, `clearSubscriptions(topic)`,
  `countSubscriptions`, `getSubscriptions`, `immediateExceptions`,
  `unsubscribe(topicString)`. (01)
- **D3 — symbol tokens: identity-keyed**, not stringified. Fixes a pubsub-js
  footgun; intentional behavior difference. (01)
- **D4 — delivery stays async `setTimeout(0)`**; per-subscriber error isolation;
  subscriber-snapshot before dispatch. (01/03)
- **D5 — `subscribe` returns an opaque STRING token** (drop-in for current hooks
  & pubsub-js consumers); modern unsubscribe-fn available via `on`. (01)
- **D6 — React:** R6 (isomorphic layout effect) in core; R1 (`useEffectEvent`)
  as an opt-in `react19` sub-path; USES & `use` rejected (recorded). (02)
- **D7 — tests:** close contract gaps first (M0), in-isolation module tests,
  differential parity vs pubsub-js (temporary), runtime smoke, 100% coverage
  thresholds. (03)
- **D8 — bundle semver-major cleanups into v2:** `Message any→unknown`, debounce
  typing (#4), interface rename `IUsePublish*`→`UsePublish*` (#5), remove default
  export (#8). **Keep `debounceMs: number|string`** (do NOT narrow, #7). (04)
- **D9 — single v2.0.0** (maintainer), executed as ordered PRs (05).

## Open questions for the maintainer (please confirm at review)

- **Q1 — Hierarchical/dotted topics?** (sharpened by review, 08-V18) Dropping is
  a *silent* runtime break for consumers who used dotted topics. Pick: **(a)**
  drop + loud CHANGELOG (lean, default); **(b)** ship an opt-in
  `createPubSub({ hierarchical: true })` in v2.0.0 (small ancestor-walk on
  publish) so migrators have a path.
- **Q7 — `createPubSub` is a separate bus from the hooks (08-V17).** Pick: **(a)**
  defer `createPubSub` to v2.1, ship v2.0.0 as a clean dep-swap + lean `PubSub` +
  `on` only; **(b)** ship `createPubSub` *and* add an optional `bus` param to the
  hooks so a typed bus integrates end-to-end (additive hook-API change); **(c)**
  ship `createPubSub` standalone with explicit "separate bus" docs.
- **Q8 — Symbol token delivery (08-V2):** confirm the intentional improvement —
  handlers now receive the **original** `symbol` token (not its string form).
  This differs from today's behavior; OK?
- **Q2 — Symbol identity vs stringify (D3)?** Default: **identity** (better).
  Confirm you're fine with the (pathological) behavior difference vs pubsub-js.
- **Q3 — Ship the React 19.2 `useEffectEvent` sub-path (R1) inside v2.0.0**
  (additive, safe) or defer to v2.1?
- **Q4 — Parity test + `pubsub-js` devDep:** default plan removes both before
  tagging v2.0.0 (truly zero-dep). Keep them around instead (for future bus
  changes)?
- **Q5 — Add the optional typed `Events` generic to the hooks in v2** (additive),
  or leave hooks untyped-payload and only `createPubSub` typed? (06)
- **Q6 — `subscribeOnce` / `unsubscribe(handler)`:** keep for compat (default),
  or go fully minimal and drop them too?

## Risks & mitigations

- **Silent behavior drift on swap (highest).** Mitigation: contract suite landed
  first (M0) against pubsub-js + differential parity (M1) + repoint oracle to the
  real singleton (so tests can't pass on a stale instance).
- **Separate-bus-instance breakage.** Consumers who used `pubsub-js` directly
  *and* our re-exported `PubSub` shared one global singleton; v2's bus is separate
  → messages won't cross. Mitigation: loud CHANGELOG note; recommend importing
  `PubSub` only from `use-pubsub-js`.
- **Dropping hierarchical topics** silently breaks consumers who adopted dotted
  topics from the upstream docs (their parent-topic subscribers stop receiving).
  Mitigation: explicit CHANGELOG + README; Q1; opt-in re-add path documented (06).
- **`any → unknown`** breaks handlers that used the payload untyped. Mitigation:
  it's a major; documented; trivial consumer fix (cast/guard).
- **Fake-timer/microtask mismatch.** If the module used microtasks, every
  fake-timer test breaks. Mitigation: enforce `setTimeout(0)` (D4) + parity.
- **Removing default export** breaks `import x from 'use-pubsub-js'`. Mitigation:
  major + documented; it was undocumented.
- **attw/publint regressions** from the new subpath. Mitigation: validate in M5;
  `typesVersions` mirrors the subpath.

## Out of scope for v2
USES integration, wildcard/`once`-at-module, hierarchical topics, performance
micro-opts — all in 06, to be picked up on demand.
