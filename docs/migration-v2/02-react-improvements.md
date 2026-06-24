# 02 — React-side improvements & version-gating

Floor is React `>=17`. Rule: **newer-React users may benefit; older-React users
must not break.** Each item below is tagged with its min React version and a
gating approach. None of these change the hooks' public API or behavior.

## Ship in v2.0.0 (React 17+, no gating)

### R6 — Latest-handler ref: `useEffect` → isomorphic `useLayoutEffect`
`useSubscribe` keeps the handler fresh with a dep-less `useEffect`:
```ts
useEffect(() => { handlerRef.current = handler })
```
`useEffect` runs *after paint*, leaving a small window where `handlerRef.current`
is stale. Switching to `useLayoutEffect` (guarded for SSR) shrinks that window to
before paint — a pure internal correctness gain, works on all supported React.

```ts
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

useIsomorphicLayoutEffect(() => { handlerRef.current = handler })
```
- Min React: 17. Gating: none (SSR handled by the isomorphic guard).
- Risk: low. No test changes (tests advance timers past 0 before asserting).
- **Decision: include in v2.0.0 core.**

### R3 — Referential stability of returned objects (document; optional `useMemo`)
`useSubscribe` returns a fresh `{ unsubscribe, resubscribe }` object each render
(both fns are already `useCallback`-stable); `usePublish` returns a fresh
`{ lastPublish, publish }`. Only matters if a consumer passes the whole object to
a `memo` child / effect dep.
- **Decision:** document "destructure the return value" in the README. Add
  `useMemo` on the returned object only if a real re-render cost is shown
  (deferred; React Compiler handles it automatically for adopters).

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
| R6 isomorphic layout effect | 17 | **Yes (core)** | none | none |
| R3 stable return (doc) | any | Yes (docs) | none | none |
| R1 `useEffectEvent` | 19.2 | maybe (sub-path) | sub-path export | none |
| USES | 18 | no | — | — |
| `use` | 19 | no | — | — |
