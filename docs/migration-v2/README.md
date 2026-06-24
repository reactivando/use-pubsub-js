# use-pubsub-js v2 — migration & improvement plan

**Goal:** replace the single runtime dependency `pubsub-js` with an internal,
zero-dependency TypeScript pub/sub module, and bundle in the React-side
improvements + the deferred semver-major cleanups — all in one **v2.0.0**.

This folder is the plan. It was synthesized from five parallel research passes
(pubsub-js surface & usage, new-API design, React perf/integration, testing
strategy, packaging/DX) and is meant to be reviewed milestone-by-milestone
before any code is written.

## Documents

| File | What |
| --- | --- |
| [01-api-design.md](./01-api-design.md) | The internal module: lean `PubSub` + typed `createPubSub` + `on`/AbortSignal; what's kept/dropped from pubsub-js; behaviors that must match. |
| [02-react-improvements.md](./02-react-improvements.md) | React-side improvements + version-gating (React 17 floor, opt-in React 19.2 lane). |
| [03-testing-strategy.md](./03-testing-strategy.md) | Contract-gap tests, in-isolation module tests, differential/parity test, smoke tests, CI. |
| [04-packaging-dx.md](./04-packaging-dx.md) | Dependency removal, exports map, types, build, CHANGELOG/migration notes, metadata. |
| [05-milestones.md](./05-milestones.md) | Step-by-step execution as PR-sized milestones with verification gates. |
| [06-ideas-backlog.md](./06-ideas-backlog.md) | Version-specific / future progressive-enhancement ideas to "save". |
| [07-decisions-and-risks.md](./07-decisions-and-risks.md) | Decision log (what I decided and why), open questions for the maintainer, risks. |
| [08-review-verdicts.md](./08-review-verdicts.md) | **Authoritative.** Adjudication of the 3 adversarial reviews + the resulting amendments. Where it conflicts with 01–07, 08 wins. |
| [milestones.yml](./milestones.yml) | Machine-readable milestone/checklist mirror of 05, for execution tracking. |

> **Read 08 first.** The plan was put through three adversarial reviews; 08
> records every verdict and the amendments (two BLOCKERs were verified against the
> code: the `example/` app breaks on the dep removal, and the `String(token)`
> delivery contradicts the typed API). 01–07 are the original draft; 08 is the
> corrected plan of record.

## Non-negotiable constraints (carried from the whole project)

1. **The public hook API** — `usePublish` / `useSubscribe` names, params, return
   shapes — and the pub/sub subscribe/unsubscribe/publish **runtime behavior**
   must not regress. The 41-test suite (incl. the pub/sub *contract* suite) is
   the safety net; never make a test pass by weakening it.
2. **Async delivery** stays `setTimeout(0)` (not microtasks) — the tests pin it
   and consumers depend on "publish returns before handlers run".
3. **React floor is `>=17`** (peer dep). Newer-React features are opt-in /
   gated so older-React users never break.
4. **Zero runtime dependencies** is the headline win — don't reintroduce one.

## Locked decisions (from the maintainer)

- **Lean public API**, but also ship a **better, typed** API (`createPubSub`) —
  see 01.
- **Single big v2.0.0**: dependency swap + React improvements + the semver-major
  type cleanups land together.

## How to read / use this

Start with [07-decisions-and-risks.md](./07-decisions-and-risks.md) for the
decision log and open questions, then [05-milestones.md](./05-milestones.md) for
the execution order. The other docs are the detail behind each decision.
