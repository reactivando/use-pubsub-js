# 02 — React-side improvements & version-gating

Floor is React `>=17`. Rule: **newer-React users may benefit; older-React users
must not break.** Each item below is tagged with its min React version and a
gating approach. None of these change the hooks' public API or behavior.

## Ship in v2.0.0 (React 17+, no gating)

### R6 — ~~`useEffect` → isomorphic `useLayoutEffect`~~ **DROPPED** (see 08-V16)
Adversarial review showed this is cargo-cult: with `setTimeout(0)` delivery the
render→effect stale-handler window is **unreachable** (the existing "handler
changes" test proves the current `useEffect` is correct), and `useLayoutEffect`
adds SSR/layout cost for no observable gain. **Decision: leave the handler-ref
`useEffect` as-is in v2.** The render-time ref write
(`handlerRef.current = handler` during render) and `useEffectEvent` (19.2) are
recorded in 06 as the preferred options *if* we ever touch this hook.

### R3 — Memoize the hooks' return objects **(now v2.0.0 core — see 08-V3)**
`useSubscribe` returns a fresh `{ unsubscribe, resubscribe }` each render;
`usePublish` returns a fresh `{ lastPublish, publish }`. The inner fns are already
`useCallback`-stable, but the **object identity** changes every render. With
`eslint-plugin-react-hooks/exhaustive-deps` (ubiquitous), a consumer who captures
the whole return and puts it in a dep array gets an **infinite effect loop** —
"document destructuring" doesn't prevent that.
```ts
return useMemo(() => ({ unsubscribe, resubscribe }), [unsubscribe, resubscribe])
```
- Min React: 16.8. Gating: none. Behavior-neutral (same values, stable identity).
- **Decision: include in v2.0.0 core** (was "document only" — upgraded by review).
  Also document destructuring in the README as a complement.

## Progressive enhancement (React 19.2+ lane) — opt-in, additive

### R1 — `useEffectEvent` for `useSubscribe` (replaces the ref+effect entirely)
`useEffectEvent` (stable in React 19.2, Oct 2025) is the canonical fix for the
"latest ref" pattern: a stable function identity that always calls the latest
`handler`, no ref + effect needed.
```ts
const internalHandler = useEffectEvent((msg, data) => handler(msg as TokenType, data))
```
- Min React: **19.2**. Cannot be conditionally called (Rules of Hooks), so gate
  via a **separate sub-path export** rather than a runtime `if`:
  - `use-pubsub-js/react19/useSubscribe` (and maybe `/usePublish`) — a parallel
    entry using `useEffectEvent`; the default entry keeps the R6 implementation.
  - Zero overhead/zero risk for existing users; React 19.2 users opt in.
- **Decision:** **save as a ready-to-build progressive-enhancement** (see
  06-ideas-backlog). *Open question for maintainer:* ship the `react19` sub-path
  *in* v2.0.0 (additive, safe) or in a later v2.x? (07, Q3)

## Considered and rejected (recorded so we don't re-litigate)

### USES — `useSyncExternalStore`: **not a fit**
USES is for **readable snapshot state** with tearing protection. `useSubscribe`
delivers **push events** with no "current value" to snapshot. Forcing USES would
require the bus to store last-value state it doesn't need and would add a render
cycle per message. Revisit **only** if the bus ever grows a
BehaviorSubject/replay-last-value mode (then USES becomes natural + needs
`getServerSnapshot` for SSR). Min React: 18. **Decision: skip.**

### React 19 `use`: **not applicable**
`use` reads Promises/Context for Suspense. Neither hook involves suspendable
data. **Decision: skip** (recorded because the maintainer specifically asked
about `use`).

## Summary

| Item | Min React | In v2.0.0? | Gating | API change |
| --- | --- | --- | --- | --- |
| R3 `useMemo` the returns | 16.8 | **Yes (core)** | none | none |
| R6 isomorphic layout effect | 17 | **No — dropped (08-V16)** | — | — |
| R1 `useEffectEvent` | 19.2 | maybe (sub-path, Q3) | sub-path export | none |
| USES | 18 | no | — | — |
| `use` | 19 | no | — | — |

> v2 core's only React change is **R3** (memoize the return objects). The
> handler-ref effect is left untouched.
