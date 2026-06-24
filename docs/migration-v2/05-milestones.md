# 05 — Milestones (execution order)

One **v2.0.0**, executed as a sequence of small PRs into `main` (main runs ahead
of the published 1.3.3 until we tag v2). Each PR follows the project's standard
gate: local build + test/coverage + lint + e2e green → adversarial subagent
review → independently verify findings → CI green → squash-merge. The ordering
front-loads the **safety net** so the actual swap is verifiable.

> Tests-first is deliberate: M0 lands the contract-gap tests *against the current
> pubsub-js backend* (they pass now), so when M2 swaps the backend any divergence
> turns a test red instead of shipping silently.

## M0 — Contract safety net (against current pubsub-js)
Add the MUST-HAVE contract-gap tests from 03-§B (delivery order, error isolation,
unsubscribe-during-delivery, re-entrancy, `clearAllSubscriptions`, symbol
behavior) to the existing suite. They must pass against pubsub-js today.
**Gate:** suite green incl. new tests; no source change.
*Note:* the symbol-identity test (03-§B.6) asserts the **new** intended behavior,
which differs from pubsub-js — write it in M1/M2 against the new module, not here.

## M1 — Build the internal module (not wired into hooks yet)
- `src/pubsub/index.ts`: `PubSub`, `createPubSub`, `on`, `subscribeOnce`,
  `unsubscribe(token|handler)`, `clearAllSubscriptions` (per 01).
- `src/pubsub/pubsub.spec.ts`: in-isolation unit tests (03-§C).
- `src/pubsub/parity.spec.ts`: differential test vs pubsub-js (03-§D); keep
  `pubsub-js` as devDep.
**Gate:** module unit tests + parity green; build/attw/publint green; hooks/
public API untouched.

## M2 — Swap the hooks + index to the internal module
- `useSubscribe`/`usePublish`/`src/index.ts`: import from `../pubsub`; repoint the
  spec oracles (03-§A). Remove `pubsub-js` from `dependencies` (keep as devDep
  for parity until M6).
- `Message = any` → `unknown` in `useSubscribe`.
**Gate:** full suite (incl. contract + integration) green; parity green; e2e
green; behavior identical to 1.3.3 except the documented intentional differences.
**This is the riskiest PR — most scrutiny in review.**

## M3 — React correctness improvement (R6) + return-stability docs
- `useSubscribe`: dep-less `useEffect` → `useIsomorphicLayoutEffect` (02-§R6).
- README: document destructuring the return value (02-§R3).
**Gate:** suite green; no public API change. *(May be folded into M2 if small.)*

## M4 — Semver-major cleanups (bundled per "single big v2.0.0")
- `debounce.ts`: drop `@ts-nocheck`, narrow the generic, type `args` (#4).
- Rename `IUsePublish*` → `UsePublish*` (#5).
- Remove the `export default { ... }` barrel (#8); clears `MIXED_EXPORTS`.
- Keep `debounceMs: number | string` (decided — not narrowing, #7).
**Gate:** suite green; emitted `.d.ts` reviewed; attw/publint green.

## M5 — Packaging: `./pubsub` subpath + types
- Add `./pubsub` export + `typesVersions` entry; update description/keywords;
  drop the empty `dependencies` key and `@types/pubsub-js`.
**Gate:** attw `--pack` all-green, publint clean, frozen install (root+example),
e2e smoke (incl. the new subpath, CJS+ESM) green.

## M6 — Docs, migration notes, remove migration scaffolding
- README rewrite (drop "wrapper of pubsub-js"; document `PubSub` surface +
  `createPubSub` + `on`); CHANGELOG migration section (04).
- **Remove `parity.spec.ts` and the `pubsub-js` devDep** so the released package
  is truly dependency-free. Add coverage thresholds to `vitest.config.ts` (03-§F).
**Gate:** suite green without pubsub-js present; audit clean; zero deps confirmed.

## M7 — Release v2.0.0 (maintainer-triggered)
- Confirm CHANGELOG reads as a major; trigger the OIDC release workflow.
  **I do not trigger releases.**
- *Optional, if chosen (07-Q3):* ship the `react19` sub-path (R1) — either within
  M3/M5 or as a fast-follow v2.1.

## Cross-cutting gates (every PR)
build · test+coverage · lint (ultracite) · e2e · `pnpm audit` clean · adversarial
review with findings independently verified · CI green before squash-merge.

## Rollback posture
Each milestone is independently revertable. The risky swap (M2) is guarded by the
contract suite (M0) + parity (M1); if parity/contedract diverges unexpectedly, fix
the module before proceeding — never weaken a test.
