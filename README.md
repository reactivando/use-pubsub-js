# use-pubsub

> A service and hooks for React to publish or subscribe (wrapper of [pubsub-js](https://github.com/mroderick/PubSubJS))

[![NPM](https://img.shields.io/npm/v/use-pubsub.svg)](https://www.npmjs.com/package/use-pubsub) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm i use-pubsub
```
```bash
yarn add use-pubsub
```

## Usage

You can import the hooks or a service to use where you want

```ts
import { PubSub, usePublish, useSubscribe } from 'use-pubsub'
```

### useSubscribe
```tsx
import { PubSub, useSubscribe } from 'use-pubsub'

setTimeout(() => PubSub.publish('token', 'message');, 5000);

const ExampleUseSubscribe = () => {
  const handler = (token, message) => {
    console.log(`Message ${message} - Token ${token}`);
  }

  const { unsubscribe, resubscribe } = useSubscribe({ token: 'token', handler });

  return (
    <div>
      <button type="button" onClick={unsubscribe}>
        Unsubscribe
      </button>
      <button type="button" onClick={resubscribe}>
        Resubscribe
      </button>
    </div>
  );
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
import { PubSub, usePublish } from 'use-pubsub'

const handler = (token, message) => {
  console.log(`Message ${message} - Token ${token}`);
}

PubSub.subscribe('token_two', handler)

const ExampleUsePublish = () => {
  const { publish } = usePublish({ token: 'token_two', message: "message" });

  return (
    <div>
      <button type="button" onClick={publish}>
        Publish
      </button>
    </div>
  );
}
```

The `usePublish` hook have more than one way to use, the above is a simple wrapper
to declare your publish function using a React approach with hooks.

```tsx
import { PubSub, usePublish } from 'use-pubsub'

const handler = (token, message) => {
  console.log(`Message ${message} - Token ${token}`);
}

PubSub.subscribe('token_three', handler)

const ExampleUsePublish = () => {
  const { lastPublish } = usePublish({
    token: 'token_three',
    message: "message",
    isAutomatic: true,
  });

  return (
    <div>
      <p>{lastPublish ? Publishing success : Publication failure}</p>
    </div>
  );
}
```

The other way to use `usePublish` is with automatic publishing, always message
change is called a new publish with a new message, by default have a debounce with
300ms, you can increase, decrease ou run immediately pass a specific prop.

The returned `lastPublish` value is true if have some subscribe to receive a
message and false if they don't referring to the last publication.

### To see more information for PubSub service check the [official documentation](https://github.com/mroderick/PubSubJS)

## API Documentation

### useSubscribe

* Arguments of `useSubscribe`

key | description | type | default/required
----|-------------|------|------|
token | Token is used to subscribe listen a specific publisher | string \| Symbol | required
handler | Function that is going to be executed when a publication occurs | (token: string \| Symbol, message: any) => void | required
isUnsubscribe | Is the way to dynamically unsubscribe and subscribe based on some variable | boolean | false

* Returns of `useSubscribe`

key | description | type
----|-------------|-------------
unsubscribe | A function to manual unsubscribe the token off your handler | () => void
resubscribe | A function to manual resubscribe the token in your handler, only have effects if the handler is not linked in token  | () => void

### usePublish

* Arguments of usePublish

key | description | type | default/required
----|-------------|------|-------
token | Token is used to subscribe listen a specific publisher | string \| Symbol | required
message | The value that will be send to subscriber | any | required
isAutomatic | Whether the publication should be automatic | boolean | false
isInitialPublish | Whether to make a publication in the first render | boolean | false
isImmediate | To disable debounce and publish without delay any change in the message | boolean | false
debounceMs | The delay value | number \| string | 300

* Returns of usePublish

key | description | type
----|-------------|-------------
lastPublish | The value is true if you have a subscriber on last publication and false if you don't | boolean
publish | A function to manual publish a message | () => void

## License

MIT © [Reactivando](https://github.com/reactivando/use-pubsub/LICENSE)

---

This hook is created using [create-react-hook](https://github.com/hermanya/create-react-hook).
