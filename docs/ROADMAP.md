# Roadmap / backlog

`v2.0.0` shipped the internal zero-dependency bus plus the full enhancement set
(typed + hierarchical buses, `useBusState`, the React 19.2 `useEffectEvent` lane,
configurable `onError`, branded tokens, and a thoroughly hardened test suite).

The items below are **deliberately deferred** — none are required, and most are
"do on demand." The full v2 design history lives in git history and the
[v2.0.0 release notes](https://github.com/reactivando/use-pubsub-js/releases/tag/v2.0.0).

## On request (no current demand)

- **`publishSync`** — synchronous delivery. Omitted to keep the async contract
  clear; straightforward to add as a separate method if someone needs it.
- **`*` / `subscribeAll` wildcard** — a global listener (logging/devtools). It
  conflicts with typed event maps, so add it behind an opt-in only if asked.

## Docs / distribution (nice-to-have)

- **TypeDoc API site** (GitHub Pages — the workflow already exists) and a **JSR**
  publish for non-React TypeScript consumers.

## Considered & deferred (with reasons)

- **Stable-debounce / drop the return `useMemo`** — measured as a behaviour-change
  risk (the `isImmediate` + rapid-message path) for negligible gain. Skip unless
  profiling motivates it.
- **Mutation testing in CI** — a one-off Stryker audit was run (87% score; the one
  real gap was fixed). Ongoing CI runs were left out for cost; re-add
  `@stryker-mutator/core` + `@stryker-mutator/vitest-runner` and a config to rerun.
- **Dependabot / SHA-pinned Actions** — declined as noise/overkill for a
  zero-dependency library.
- **Perf micro-opts** (single-subscriber fast path, `Set`-backed channels) —
  negligible at this library's scale; only act on a benchmark.
