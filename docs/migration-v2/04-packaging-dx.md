# 04 — Packaging & DX

## Dependency removal (the headline)

- Remove `pubsub-js` from `dependencies` (and drop the now-empty `dependencies`
  key) and `@types/pubsub-js` from `devDependencies`.
- Result: **zero runtime dependencies.** `sideEffects: false` stays correct
  (it describes this package's exports, not the singleton internals).
- `pubsub-js` is `unbundle`'d today (shipped as an external the consumer
  installs), so the win is a narrower install graph for consumers, plus full
  ownership of behavior and types.

## Exports map

Add a dedicated subpath for the bus so it can be used outside React (test setup,
workers, non-React code) without pulling React types:

```jsonc
"exports": {
  ".":                  { /* unchanged */ },
  "./pubsub": {
    "import":  { "types": "./dist/pubsub/index.d.ts",  "default": "./dist/pubsub/index.js" },
    "require": { "types": "./dist/pubsub/index.d.cts", "default": "./dist/pubsub/index.cjs" }
  },
  "./hooks/usePublish":  { /* unchanged */ },
  "./hooks/useSubscribe":{ /* unchanged */ },
  "./utils/debounce":    { /* unchanged */ },
  "./package.json": "./package.json"
}
```

- Keep `types` before `default` in each condition (attw/publint requirement —
  already correct in the repo).
- Mirror the new subpath in `typesVersions` (publint warns otherwise):
  `"pubsub": ["./dist/pubsub/index.d.ts"]`.
- If R1's React 19 lane ships (02), add `./react19/useSubscribe` similarly.
- `unbundle: true` + the `src/**/*.ts` glob means `src/pubsub/index.ts` →
  `dist/pubsub/index.{js,cjs,d.ts,d.cts}` automatically. **No tsdown/tsconfig
  change required.** (`isolatedModules` is fine — the file exports.)

## Types

- Replace `type Message = any` → `unknown` in `useSubscribe`; drop the
  `biome-ignore noExplicitAny`. Handlers must narrow — this is a **breaking type
  change** (bundled into v2; see also the deferred semver items in 07).
- The new module ships real types: `PubSubBus`, `TypedPubSub<E>`, `EventMap`,
  `Listener<T>`, `createPubSub`.
- Validate with `attw --pack` (all entries green across node10/node16/bundler —
  keep the `typesVersions` node10 shim) and `publint` (all good).

## Build

No `tsdown.config.ts` / `tsconfig.json` change needed for the new module file.
Confirm after adding it that `pnpm build` emits the `dist/pubsub/*` quartet and
attw/publint stay green.

## Deferred semver-major cleanups to bundle into v2 (maintainer chose "single big v2.0.0")

- **#4** `debounce.ts`: drop `@ts-nocheck`, narrow `T extends Function` →
  `T extends (...args: any[]) => any`, type `args` as `any[]`. Re-enable the
  Biome rules disabled for that file where possible.
- **#5** interface naming: unify `IUsePublishResponse`/`IUsePublishParams` →
  `UsePublishResponse`/`UsePublishParams` (match `UseSubscription*`). Breaking
  type rename.
- **#8** remove the undocumented `export default { ... }` from `src/index.ts`
  (named exports only). Also clears the `MIXED_EXPORTS` build warning.
- **#7** `debounceMs: number | string`: **keep as-is** (string coercion is
  documented and used). *Decision: do NOT narrow.* (See 07.)

## Consumer migration guide (draft CHANGELOG bullets for v2.0.0)

**Breaking:**
- `pubsub-js` is no longer a dependency. `PubSub` is now the library's own
  internal bus. **If you previously also used `pubsub-js` directly elsewhere in
  your app, you were sharing one global singleton with this package; in v2 the
  internal bus is a separate instance — messages won't cross.** Import `PubSub`
  exclusively from `use-pubsub-js` for a single shared bus.
- **Dropped pubsub-js features**: hierarchical/namespaced dotted topics,
  `publishSync`, `subscribeAll`/`*` wildcard, `clearSubscriptions(topic)`,
  `countSubscriptions`, `getSubscriptions`, `immediateExceptions`,
  `unsubscribe(topicString)`. (Kept: `publish`, `subscribe`, `subscribeOnce`,
  `unsubscribe(token|handler)`, `clearAllSubscriptions`.)
- **Symbol tokens are matched by identity**, not by string form. Two different
  `Symbol('x')` no longer collide (this was a pubsub-js quirk).
- **`message` payload type tightened `any` → `unknown`** — add a guard/cast in
  typed handlers.
- Removed the **default export**; use named imports.
- Type renames: `IUsePublish*` → `UsePublish*`.

**Additive:**
- `import { PubSub } from 'use-pubsub-js/pubsub'` — use the bus directly.
- `createPubSub<EventMap>()` — fully-typed channels.
- `on(token, handler, { signal })` — returns an unsubscribe fn; `AbortSignal`
  teardown.
- Zero runtime dependencies.

## Metadata

- `version: 2.0.0`.
- Update `description` (currently implies "wrapper of pubsub-js") to e.g.
  "Lightweight, dependency-free React hooks + pub/sub bus".
- README: fix the "wrapper of pubsub-js" subtitle and the "see pubsub-js docs"
  delegation; document the actual supported `PubSub` surface + `createPubSub`.
  Keep keywords; optionally add `zero-dependencies`.
