# 03 — Testing strategy

The 41-test suite already includes a pub/sub **contract** suite (async delivery,
payload-by-reference, multi-subscriber isolation, Symbol tokens, cross-hook
integration). That's the backbone for a safe swap, but it has gaps. This plan
closes them, adds in-isolation module tests, and adds a **differential/parity**
test that mechanically proves the new module behaves like pubsub-js.

## A. Repoint the test oracle (required)

Today the hook specs `import PubSub from 'pubsub-js'` and use it as the oracle
(subscribe to observe, publish to drive). After the swap, the hooks import the
**internal** module; the specs must import the **same** singleton
(`../pubsub`), or tests will exercise a different instance and silently pass on
stale behavior. This is a required, mechanical change in all spec files.

## B. Contract gaps to close (MUST-HAVE — protect the swap)

Add these (in `useSubscribe.spec.ts` and/or the new module spec):
1. **Delivery order** across N subscribers (assert insertion order via a shared counter).
2. **Error isolation** — handler A throws, handler B still receives.
3. **Unsubscribe-during-delivery** — a handler unsubscribing (itself/another) mid-dispatch doesn't skip others in the current dispatch (snapshot semantics).
4. **Re-entrancy** — a handler that `publish()`es another token doesn't deadlock/lose messages.
5. **`clearAllSubscriptions()` semantics** — after it, publishes return `false` (and it exists — the `afterEach` depends on it).
6. **Symbol identity** — two different `Symbol('x')` (same description) must NOT cross-deliver (verifies identity-keying, per 01 decision). This is the test that pins the intentional difference from pubsub-js.

NICE-TO-HAVE: large fan-out (20 subscribers each once); repeated subscribe/
unsubscribe cycles leave clean state.

## C. New in-isolation module tests (MUST-HAVE)

`src/pubsub/pubsub.spec.ts` — test the module directly (not through hooks) so a
failure points at the module:
- subscribe→token; unsubscribe(token) and unsubscribe(handler); publish return
  value (true/false); async delivery; `(token, data)` arg order; payload by
  reference; fan-out + order; error isolation; re-entrancy; symbol identity;
  `subscribeOnce` fires once; `on()` returns a working unsubscribe fn;
  `on(..., { signal })` unsubscribes on `abort()`; `clearAllSubscriptions()`.

## D. Differential / parity test (MUST-HAVE during migration)

`src/pubsub/parity.spec.ts` — parameterize the same scenarios over **both**
`pubsub-js` (reference) and the internal module, asserting identical observable
output for the **shared** surface (publish return, async delivery, by-reference,
fan-out, unsubscribe isolation, error isolation). Keep `pubsub-js` as a
**devDependency** for this only.

- Exclude the intentionally-divergent cases (symbol identity vs stringify;
  dropped hierarchical topics) from parity, or assert the *documented*
  difference explicitly.
- Both buses are separate imports → independent state; reset in `afterEach`.
- Delivery mechanism must match (`setTimeout(0)`), or the fake-timer flush
  differs. The module MUST use `setTimeout`, not microtasks.
- **Lifecycle decision:** parity is a *migration artifact*. Keep it (and the
  `pubsub-js` devDep) on the v2 branch and through the v2 PR's CI; **remove both
  before tagging v2.0.0** so the released package has zero deps and no stray
  reference dep. *(Flagged in 07, Q4: keep vs remove.)*

## E. Smoke tests (MUST-HAVE)

`e2e/test.cjs` + `e2e/test.mjs` currently only assert exports are defined.
Extend with a runtime check that needs no React/jsdom:
`PubSub.subscribe(t, h)` → `PubSub.publish(t, data)` → flush one tick → assert
`h` called with `(t, data)`; assert `clearAllSubscriptions` exists. If `./pubsub`
becomes a public subpath, smoke-test that entry too (CJS + ESM). Runs via the
existing `pnpm test:e2e` in `e2e-test.yml` — no new job.

## F. CI

- **Coverage thresholds** in `vitest.config.ts` (branches/functions/lines/
  statements: 100) so the current 100% can't silently regress. Vitest exits
  non-zero on miss — no new step. (Note: `src/index.ts` is already coverage-
  excluded; ensure new entry/barrel files are excluded consistently.)
- Parity + new specs run automatically (vitest picks up `*.spec.ts`).
- Optional: a distinct `parity` job for visibility / clean removal later
  (NICE-TO-HAVE).

## G. Determinism / flakiness

- Module MUST deliver via `setTimeout(0)` so `vi.advanceTimersByTime(0)` flushes it.
- Standardize new spec files on `beforeEach(vi.useFakeTimers)` /
  `afterEach(vi.useRealTimers)` to avoid timer-state leakage across files.
- Timer advances that cause React state updates stay inside `act()`; direct
  bus/parity tests (no React) must NOT use `act()`.

## Definition of done (tests)

- All contract gaps (B) + module tests (C) green; parity (D) green for the shared
  surface; smoke (E) green in CI; coverage thresholds (F) enforced; suite
  deterministic (G). Net: the swap cannot change observable behavior without a
  red test.
