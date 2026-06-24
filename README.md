# use-pubsub-js

> Dependency-free React hooks and a pub/sub bus for publish/subscribe messaging

<a target="_blank" href="https://www.npmjs.com/package/use-pubsub-js">
  <img src="https://img.shields.io/npm/v/use-pubsub-js.svg" alt="npm version">
</a>
<a target="_blank" href="https://coveralls.io/github/reactivando/use-pubsub-js?branch=main">
  <img src="https://coveralls.io/repos/github/reactivando/use-pubsub-js/badge.svg?branch=main" alt="Coverage Status">
</a>
<a target="_blank" href="https://github.com/reactivando/use-pubsub-js/blob/main/LICENSE">
  <img src="https://img.shields.io/github/license/reactivando/use-pubsub-js?style=plastic" alt="License">
</a>
<a target="_blank" href="https://app.codacy.com/gh/reactivando/use-pubsub-js/dashboard">
  <img src="https://img.shields.io/codacy/grade/b1c4b6ce43164da49a7fa937ee917df7?style=plastic" alt="Codacy grade">
</a>
<a target="_blank" href="https://bundlephobia.com/result?p=use-pubsub-js">
  <img src="https://img.shields.io/bundlephobia/min/use-pubsub-js?style=plastic" alt="Minified bundle size">
</a>


## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Examples](#examples)
- [API Documentation](#api-documentation)
- [License](#license)

## Install

```bash
npm i use-pubsub-js
```
```bash
yarn add use-pubsub-js
```
```bash
pnpm add use-pubsub-js
```

## Usage

You can import the hooks or a service to use where you want

```ts
import { PubSub, usePublish, useSubscribe } from 'use-pubsub-js'
```

### useSubscribe
```tsx
import { PubSub, useSubscribe } from 'use-pubsub-js'

setTimeout(() => PubSub.publish('token', 'message'), 5000)

const ExampleUseSubscribe = () => {
  const handler = (token, message) => {
    console.log(`Message ${message} - Token ${token}`)
  }

  const { unsubscribe, resubscribe } = useSubscribe({ token: 'token', handler })

  return (
    <div>
      <button type="button" onClick={unsubscribe}>
        Unsubscribe
      </button>
      <button type="button" onClick={resubscribe}>
        Resubscribe
      </button>
    </div>
  )
}
```

The `useSubscribe` is a hook to listen publications that are made using the same
token in publish and subscription. The hook returns two functions, one to
unsubscribe the token off your handler and one to resubscribe your function to
token.

You can only invoke the hook and dynamically unsubscribe and subscribe pass the
`isUnsubscribe` prop to hook.

### usePublish
```tsx
import { PubSub, usePublish } from 'use-pubsub-js'

const handler = (token, message) => {
  console.log(`Message ${message} - Token ${token}`)
}

PubSub.subscribe('token_two', handler)

const ExampleUsePublish = () => {
  const { publish } = usePublish({ token: 'token_two', message: 'message' })

  return (
    <div>
      <button type="button" onClick={publish}>
        Publish
      </button>
    </div>
  )
}
```

The `usePublish` hook have more than one way to use, the above is a simple wrapper
to declare your publish function using a React approach with hooks.

```tsx
import { PubSub, usePublish } from 'use-pubsub-js'

const handler = (token, message) => {
  console.log(`Message ${message} - Token ${token}`)
}

PubSub.subscribe('token_three', handler)

const ExampleUsePublish = () => {
  const { lastPublish } = usePublish({
    token: 'token_three',
    message: 'message',
    isAutomatic: true,
  })

  return (
    <div>
      <p>{lastPublish ? 'Publishing success' : 'Publication failure'}</p>
    </div>
  )
}
```

The other way to use `usePublish` is with automatic publishing, always message
change is called a new publish with a new message, by default have a debounce with
300ms, you can increase, decrease ou run immediately pass a specific prop.

The returned `lastPublish` value is true if have some subscribe to receive a
message and false if they don't referring to the last publication.

### The `PubSub` bus

Since v2 the `PubSub` bus is built in (no `pubsub-js` dependency). It supports
`subscribe(token, handler)` (returns a token), `unsubscribe(token | handler)`,
`publish(token, data)` (async; returns `true` if at least one subscriber
received it), `subscribeOnce`, `on(token, handler, { signal })` (returns an
unsubscribe function and supports `AbortSignal`), and `clearAllSubscriptions`.
Tokens are `string | symbol` (symbols match by identity). String topics are
**hierarchical**: publishing `a.b.c` also notifies `a.b` and `a` subscribers.

For typed channels, create your own bus and import it where needed (also
available from the `use-pubsub-js/pubsub` subpath):

```ts
import { createPubSub } from 'use-pubsub-js'

type AppEvents = {
  'user:login': { userId: string }
  'cart:update': { itemCount: number }
}

export const bus = createPubSub<AppEvents>()
bus.publish('user:login', { userId: '42' }) // payload is type-checked
```

Both hooks accept an optional `bus` param so they can drive a typed bus with
full end-to-end inference (the `token` and `message`/`handler` payload are typed
from the event map):

```tsx
import { usePublish, useSubscribe } from 'use-pubsub-js'
import { bus } from './bus'

// message is type-checked as { userId: string }
usePublish({ bus, token: 'user:login', message: { userId: '42' } })

// handler's second arg is inferred as { userId: string }
useSubscribe({ bus, token: 'user:login', handler: (_, user) => console.log(user.userId) })
```

> Note: `createPubSub()` returns a **separate** bus instance. Omit `bus` (or
> leave it as the default) to use the shared `PubSub` singleton. Keep the `bus`
> reference stable (e.g. module scope) — changing it re-subscribes/re-publishes.

### Migrating from v1 to v2

- The minimum supported React version is now **18.0.0** (was 17). The hooks use
  only stable React primitives, but React 18+ is required so the library can rely
  on automatic batching and `useSyncExternalStore`.
- `pubsub-js` is no longer a dependency; `PubSub` is the library's own bus. If
  you also used `pubsub-js` directly elsewhere you were sharing one global
  singleton — in v2 the bus is independent, so those direct subscribers will no
  longer receive messages from the hooks' `PubSub`. Import `PubSub` only from
  `use-pubsub-js` for a single shared bus, and remove `pubsub-js` from your own
  dependencies if you no longer need it.
- The subscriber `message` payload type is now `unknown` (was `any`) — narrow or
  cast it in your handler. `usePublish`'s `message` is likewise widened from
  `string` to `unknown`, so you can publish any payload through the hook.
- The default export was removed — use named imports.
- `IUsePublishParams`/`IUsePublishResponse` were renamed to
  `UsePublishParams`/`UsePublishResponse`.
- The `useSubscribe` types `UseSubscriptionParams`/`UseSubscriptionResponse`
  were renamed to `UseSubscribeParams`/`UseSubscribeResponse` for parity with
  the `usePublish` types.
- Both hooks now accept an optional `bus` param (defaults to the `PubSub`
  singleton), so a `createPubSub<E>()` bus can be driven through the hooks with
  typed payloads.
- Symbol tokens match by identity (two distinct `Symbol('x')` no longer collide).
- Removed rarely-used pubsub-js extras (`publishSync`, `subscribeAll`/`*`
  wildcard, `clearSubscriptions(topic)`, `countSubscriptions`,
  `getSubscriptions`, `immediateExceptions`). `publish`, `subscribe`,
  `subscribeOnce`, `unsubscribe`, `clearAllSubscriptions` and hierarchical
  topics are kept.

## Examples

**Checkout the simple examples on [Example folder](https://github.com/reactivando/use-pubsub-js/blob/main/example/src/App.tsx)**

or

More real examples:

[![Edit use-pubsub-js](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/use-pubsub-js-ei2ly?fontsize=14&hidenavigation=1&theme=dark)

## API Documentation

### useSubscribe

* Arguments of `useSubscribe`

| key           | description                                                                | type                                            | default/required |
| ------------- | -------------------------------------------------------------------------- | ----------------------------------------------- | ---------------- |
| token         | Token is used to subscribe listen a specific publisher                     | string \| symbol                                | required         |
| handler       | Function that is going to be executed when a publication occurs            | (token: string \| symbol, message: unknown) => void | required         |
| isUnsubscribe | Is the way to dynamically unsubscribe and subscribe based on some variable | boolean                                         | false            |
| bus           | The bus to subscribe on; pass a `createPubSub<E>()` bus for typed payloads | PubSubBus \| TypedPubSub\<E\>                    | PubSub singleton |

> The `handler` `message` is `unknown` by default; when a typed `bus` is passed
> it is narrowed to the payload type for that token (`Events[token]`).

* Returns of `useSubscribe`

| key         | description                                                                                                         | type       |
| ----------- | ------------------------------------------------------------------------------------------------------------------- | ---------- |
| unsubscribe | A function to manual unsubscribe the token off your handler                                                         | () => void |
| resubscribe | A function to manual resubscribe the token in your handler, only have effects if the handler is not linked in token | () => void |

### usePublish

* Arguments of usePublish

| key              | description                                                             | type             | default/required |
| ---------------- | ----------------------------------------------------------------------- | ---------------- | ---------------- |
| token            | Token is used to subscribe listen a specific publisher                  | string \| symbol | required         |
| message          | The value that will be send to subscriber                               | unknown          | required         |
| isAutomatic      | Whether the publication should be automatic                             | boolean          | false            |
| isInitialPublish | Whether to make a publication in the first render                       | boolean          | false            |
| isImmediate      | To disable debounce and publish without delay any change in the message | boolean          | false            |
| debounceMs       | The delay value                                                         | number \| string | 300              |
| bus              | The bus to publish on; pass a `createPubSub<E>()` bus for typed payloads | PubSubBus \| TypedPubSub\<E\>                    | PubSub singleton |

* Returns of usePublish

| key         | description                                                                           | type       |
| ----------- | ------------------------------------------------------------------------------------- | ---------- |
| lastPublish | The value is true if you have a subscriber on last publication and false if you don't | boolean    |
| publish     | A function to manual publish a message                                                | () => void |

## Contributing

Tests use [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com).

We follow an **assertive test-description style — no `should` prefix**
(`it('publishes on mount')`, not `it('should publish on mount')`). To
normalize existing titles, run Spotify's
[`should-up`](https://github.com/spotify/should-up):

```sh
pnpm dlx should-up ./src
```

It strips `should` and conjugates common verbs; for verbs it doesn't know
you may need a small manual touch-up. (There's no Biome/lint rule for
test-title wording, so this is a convention, not a CI check.)

## License

MIT © [Reactivando](https://github.com/reactivando/use-pubsub-js/blob/main/LICENSE)
