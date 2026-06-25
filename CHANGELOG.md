# Changelog

# [2.0.0](https://github.com/reactivando/use-pubsub-js/compare/v1.3.3...v2.0.0) (2026-06-25)


* chore!: bundle/packaging hygiene (drop utils/debounce subpath, es2021 target) (#88) ([242a54f](https://github.com/reactivando/use-pubsub-js/commit/242a54f9ffa3ce562cb8ff22cc802ac67c7b6c82)), closes [#88](https://github.com/reactivando/use-pubsub-js/issues/88)
* feat!: brand SubscriptionToken so unsubscribe rejects arbitrary strings (#84) ([d401dd8](https://github.com/reactivando/use-pubsub-js/commit/d401dd8294b91984f48ae0de97c4008a34f12558)), closes [#84](https://github.com/reactivando/use-pubsub-js/issues/84) [hi#value](https://github.com/hi/issues/value)
* feat!: route subscriber errors to a configurable onError (default console.error) (#83) ([b680b95](https://github.com/reactivando/use-pubsub-js/commit/b680b959d327f6bf97bec8672e0cdb2dde33f2d2)), closes [#83](https://github.com/reactivando/use-pubsub-js/issues/83)
* feat!: drop React 17 support; require React >=18 (#82) ([7245adc](https://github.com/reactivando/use-pubsub-js/commit/7245adc528b008f74d8ec3b84ae70c0ccfb57dd6)), closes [#82](https://github.com/reactivando/use-pubsub-js/issues/82)
* feat(hooks)!: typed bus param + Events generic; widen message; rename useSubscribe types (#77) ([fa60f82](https://github.com/reactivando/use-pubsub-js/commit/fa60f82add7a4436522c93be8b56a85de2cac415)), closes [#77](https://github.com/reactivando/use-pubsub-js/issues/77)


### Features

* createHierarchicalPubSub<E> — typed + hierarchical bus ([#93](https://github.com/reactivando/use-pubsub-js/issues/93)) ([d664ac8](https://github.com/reactivando/use-pubsub-js/commit/d664ac862c1fcd86d1594a4327dd680b29708280))
* react19/useSubscribe built on useEffectEvent (opt-in subpath) ([#87](https://github.com/reactivando/use-pubsub-js/issues/87)) ([85b129d](https://github.com/reactivando/use-pubsub-js/commit/85b129d1c05cf41196396d02fb72fe13cc319d92))
* retained-value bus mode + useBusState hook (useSyncExternalStore) ([#86](https://github.com/reactivando/use-pubsub-js/issues/86)) ([4079d8a](https://github.com/reactivando/use-pubsub-js/commit/4079d8a12dee9442e5097614129ad3d4c14755b9))
* **v2-M1:** internal pub/sub module + isolation & parity tests (not yet wired) ([#71](https://github.com/reactivando/use-pubsub-js/issues/71)) ([e2605ab](https://github.com/reactivando/use-pubsub-js/commit/e2605abc22539fe4dc21202faa121a3c46d2d441))
* **v2-M2:** swap the hooks to the internal pub/sub module (zero runtime deps) ([#72](https://github.com/reactivando/use-pubsub-js/issues/72)) ([b85f121](https://github.com/reactivando/use-pubsub-js/commit/b85f121ccef2b1f43153e48110e4482d5e21b267))
* **v2-M5:** add ./pubsub subpath export, metadata, behavioral e2e smoke ([#74](https://github.com/reactivando/use-pubsub-js/issues/74)) ([1842ac9](https://github.com/reactivando/use-pubsub-js/commit/1842ac9646c13586eadabdea975fce0b2734b377))


### Performance Improvements

* **pubsub:** flatten the publish snapshot to one array ([#89](https://github.com/reactivando/use-pubsub-js/issues/89)) ([b4d9d76](https://github.com/reactivando/use-pubsub-js/commit/b4d9d7687d22855ada3d9df9c0e843f121e6c098))


### BREAKING CHANGES

* the `use-pubsub-js/utils/debounce` subpath is no longer exported.

Co-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
* `subscribe`/`subscribeOnce` return `SubscriptionToken` (branded)
instead of a plain string; code that stored the token as `string` and passed it
to `unsubscribe` must type it as `SubscriptionToken`.

Co-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
* subscriber errors no longer re-throw asynchronously; they go to
onError (default console.error). Pass `createPubSub({ onError })` to customize,
or `onError: (e) => { setTimeout(() => { throw e }) }` to restore the old behavior.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

* fix(pubsub): guard against a throwing onError; strengthen error tests

Adversarial review found that a user onError that itself throws would propagate
out of the delivery setTimeout and re-introduce the uncaught-exception crash
(and abort delivery to remaining subscribers). Wrap the onError call in its own
try/catch (EventEmitter-style) so it can never crash the host.

Tests from review:
- a throwing onError neither crashes delivery nor stops other subscribers
- default sink asserts console.error is called WITH the thrown error
- contract spec asserts the error reached the default sink (errSpy called once)
- e2e (CJS+ESM): a throwing subscriber on the PubSub singleton does not crash

107 tests, 100% coverage, e2e 10/10.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
* React 17 is no longer supported; the minimum is React 18.

Co-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
* `UseSubscriptionParams`/`UseSubscriptionResponse` are renamed to
`UseSubscribeParams`/`UseSubscribeResponse`; `usePublish` `message` is now
`unknown` instead of `string`.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

* fix(usePublish): don't swallow valid falsy auto-publish payloads; address review

Adversarial review of the typed-hooks change found that widening `message` to
`unknown` made the `isAutomatic && message` truthiness guard silently skip valid
falsy payloads (0, false). Guard now skips only the unset sentinels
(undefined / null / empty string), preserving the original empty-string behavior
while letting 0/false/NaN publish. Mutation-verified: the new test fails against
the old guard.

Also from review:
- Add integration coverage for a custom bus: automatic publish, unmount cleanup
  (the others — typed delivery, isolation, bus-change re-subscribe — already added).
- Document why the useSubscribe internalHandler casts are sound by construction.
- README: note that handler `message` narrows to Events[token] with a typed bus.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

## [1.3.3](https://github.com/reactivando/use-pubsub-js/compare/v1.3.2...v1.3.3) (2026-06-24)


### Bug Fixes

* **usePublish:** guard initial publish under StrictMode + harden debounceMs ([#65](https://github.com/reactivando/use-pubsub-js/issues/65)) ([537fd6c](https://github.com/reactivando/use-pubsub-js/commit/537fd6cf9734503fcdd8de81ababd46e76dbab8d)), closes [#1](https://github.com/reactivando/use-pubsub-js/issues/1) [#2](https://github.com/reactivando/use-pubsub-js/issues/2)

## [1.3.2](https://github.com/reactivando/use-pubsub-js/compare/v1.3.1...v1.3.2) (2025-12-18)

## [1.3.1](https://github.com/reactivando/use-pubsub-js/compare/v1.3.0...v1.3.1) (2025-12-18)

# [1.3.0](https://github.com/reactivando/use-pubsub-js/compare/v1.2.0...v1.3.0) (2025-09-19)


### Features

* improve the tsdown config ([#53](https://github.com/reactivando/use-pubsub-js/issues/53)) ([1d37b19](https://github.com/reactivando/use-pubsub-js/commit/1d37b19f01eccf11ffd4fef29f68284552fac3ef))

# [1.2.0](https://github.com/reactivando/use-pubsub-js/compare/v1.1.0...v1.2.0) (2025-09-19)


### Features

* Refactor release process and add E2E tests ([#52](https://github.com/reactivando/use-pubsub-js/issues/52)) ([1e0e311](https://github.com/reactivando/use-pubsub-js/commit/1e0e311f4a54ed516415457d59822065bb3338e1))

# [1.1.0](https://github.com/reactivando/use-pubsub-js/compare/v1.0.7...v1.1.0) (2025-09-18)


### Bug Fixes

* Add environment to GitHub Pages workflow ([#46](https://github.com/reactivando/use-pubsub-js/issues/46)) ([6ffc76c](https://github.com/reactivando/use-pubsub-js/commit/6ffc76c7b5115f9523f8934fdfc62e70ccac9cb9))
* Build root package before example app ([#43](https://github.com/reactivando/use-pubsub-js/issues/43)) ([dbb1be8](https://github.com/reactivando/use-pubsub-js/commit/dbb1be82915b20e16b3a279fbc0ec7bbf149419b))
* **ci:** update lockfile and allow build scripts ([861ab11](https://github.com/reactivando/use-pubsub-js/commit/861ab11d5891cf71f2233d10fc454a8202858f32))
* Correct peer dependencies and finalize build setup ([#49](https://github.com/reactivando/use-pubsub-js/issues/49)) ([5dce5cb](https://github.com/reactivando/use-pubsub-js/commit/5dce5cb55e008580609abf7ddd8421039a2e9c84))
* **hooks:** correct useSubscribe handler updates ([#41](https://github.com/reactivando/use-pubsub-js/issues/41)) ([ce68dea](https://github.com/reactivando/use-pubsub-js/commit/ce68dea6edb169734bc2e7897cf048eeb26463c6))
* Mark peer dependencies as external ([#45](https://github.com/reactivando/use-pubsub-js/issues/45)) ([10d7abf](https://github.com/reactivando/use-pubsub-js/commit/10d7abf9306ab754f777fcaf89690a5f86463936))
* Resolve dependency duplication and finalize build ([#50](https://github.com/reactivando/use-pubsub-js/issues/50)) ([9987dd8](https://github.com/reactivando/use-pubsub-js/commit/9987dd8a3dc3171d44ea912d815377148d740df6))


### Features

* Add GitHub Actions workflow for Pages deployment ([#42](https://github.com/reactivando/use-pubsub-js/issues/42)) ([300c765](https://github.com/reactivando/use-pubsub-js/commit/300c76568cb881daa372d4199ebacd8978bf04bd))
* fix coverage with v8 ([fb9bbd2](https://github.com/reactivando/use-pubsub-js/commit/fb9bbd27d04c818f062bea51a876c84248a03fd0))
* fix lint ([2248c07](https://github.com/reactivando/use-pubsub-js/commit/2248c07c3012493a26f9a3799ae734d294d06738))
* fix lock ([00a37c8](https://github.com/reactivando/use-pubsub-js/commit/00a37c8be9a03d3d39f142551021bf7649ef66ee))
* improve vitest config and project maintenance ([#40](https://github.com/reactivando/use-pubsub-js/issues/40)) ([57a3110](https://github.com/reactivando/use-pubsub-js/commit/57a3110044601a97f566b00f9e96f8d2e5a8f9c2))
* modernize package ([d073dbc](https://github.com/reactivando/use-pubsub-js/commit/d073dbc7519960b87daf454f3bf001c333fb23a0))
* Refactor release process and add E2E tests ([#51](https://github.com/reactivando/use-pubsub-js/issues/51)) ([c6975f6](https://github.com/reactivando/use-pubsub-js/commit/c6975f61fd39d181c465c2f3e6eb7770a0eeeedb))
* Switch to tsdown and fix build process ([#48](https://github.com/reactivando/use-pubsub-js/issues/48)) ([9ba6b78](https://github.com/reactivando/use-pubsub-js/commit/9ba6b7882b1a8850256fe1ce99f4fdae9400278f))
