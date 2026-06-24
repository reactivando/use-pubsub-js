# use-pubsub-js — agent notes

React hooks (`usePublish`, `useSubscribe`) + an internal, dependency-free
`PubSub` bus (`src/pubsub`, also exposed via `createPubSub` and the
`use-pubsub-js/pubsub` subpath), plus a `debounce` util. Built with tsdown (dual ESM/CJS),
tested with vitest + @testing-library/react (jsdom), linted/formatted with
Biome via the ultracite preset, git hooks via lefthook. Package manager:
pnpm 11 (run via `corepack pnpm …`).

## Testing conventions

- **No `should` prefix in test descriptions.** Write assertive titles —
  `it('publishes on mount')`, not `it('should publish on mount')`. The
  bare verb (3rd person) reads as a statement of fact about the code.
- To normalize existing titles, run [`should-up`](https://github.com/spotify/should-up):

  ```sh
  pnpm dlx should-up ./src
  ```

  It strips `should` and conjugates common verbs, but it's an old tool
  (v1.0.0) and only knows a fixed verb list — it leaves verbs it can't
  conjugate (e.g. `deliver`, `flush`, `reschedule`, `resubscribe`)
  untouched, so review its output and fix any stragglers by hand.
- This convention is **not enforceable by Biome** — there is no lint rule
  for test-title wording — so it's a review/`should-up` convention, not a
  CI gate.

## Common commands

```sh
corepack pnpm test            # vitest (watch); add --run for CI mode
corepack pnpm test --run --coverage
corepack pnpm lint            # ultracite check ./src
corepack pnpm format          # ultracite fix ./src
corepack pnpm build           # tsdown
corepack pnpm test:e2e        # build + e2e (CJS/ESM import smoke tests)
```
