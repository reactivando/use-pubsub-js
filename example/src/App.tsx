import { useState } from 'react'
import {
  createPubSub,
  useBusState,
  usePublish,
  useSubscribe,
} from 'use-pubsub-js'

import { Token, TokenFour, TokenThree, TokenTwo } from './service/constants'
import { PublishService } from './service/publish'

PublishService.publish(Token)
PublishService.publish(TokenTwo)

// A typed, retained bus driven through the hooks (the v2 headline feature).
// biome-ignore lint/style/useConsistentTypeDefinitions: must be a type alias, not an interface — createPubSub<E extends EventMap> needs the implicit index signature interfaces lack
type TypedEvents = { 'counter:set': number }
const typedBus = createPubSub<TypedEvents>({ retained: true })

const ManualExternalMessages = () => {
  const [subscriptionCounter, setSubscriptionCounter] = useState(0)

  const handler = () => {
    setSubscriptionCounter(c => c + 1)
  }

  const { unsubscribe, resubscribe } = useSubscribe({ token: Token, handler })

  return (
    <div>
      <h2>Manual external messages received:</h2>
      <p>{subscriptionCounter}</p>
      <button onClick={unsubscribe} type="button">
        Unsubscribe
      </button>
      <button onClick={resubscribe} type="button">
        Resubscribe
      </button>
    </div>
  )
}

const AutoExternalMessages = () => {
  const [subscriptionCounter, setSubscriptionCounter] = useState(0)
  const [isUnsubscribe, setIsUnsubscribe] = useState(false)

  const handler = () => {
    setSubscriptionCounter(c => c + 1)
  }

  useSubscribe({ token: TokenTwo, handler, isUnsubscribe })

  return (
    <div>
      <h2>Auto external messages received:</h2>
      <p>{subscriptionCounter}</p>
      <button onClick={() => setIsUnsubscribe(s => !s)} type="button">
        Change isUnsubscribe
      </button>
    </div>
  )
}

const ManualPublishMessages = () => {
  const { publish } = usePublish({ token: TokenThree, message: 'message' })

  return (
    <div>
      <button onClick={publish} type="button">
        Publish
      </button>
    </div>
  )
}

const ReceiveManualPublish = () => {
  const [subscriptionCounter, setSubscriptionCounter] = useState(0)

  const handler = () => {
    setSubscriptionCounter(c => c + 1)
  }

  useSubscribe({ token: TokenThree, handler })

  return (
    <div>
      <h2>Manual messages received:</h2>
      <p>{subscriptionCounter}</p>
    </div>
  )
}

const AutoPublishMessages = () => {
  const [message, setMessage] = useState('')

  usePublish({
    token: TokenFour,
    message,
    isAutomatic: true,
  })

  return (
    <div>
      <input
        onChange={e => setMessage(e.target.value)}
        type="text"
        value={message}
      />
    </div>
  )
}

const ReceiveAutoPublish = () => {
  const [subscriptionCounter, setSubscriptionCounter] = useState(0)
  const [lastMessage, setLastMessage] = useState('')

  const handler = (_message: string, data: unknown) => {
    setSubscriptionCounter(c => c + 1)
    setLastMessage(String(data))
  }

  useSubscribe({ token: TokenFour, handler })

  return (
    <div>
      <h2>Automatic messages received:</h2>
      <p>{subscriptionCounter}</p>
      <p>Last message: {lastMessage}</p>
    </div>
  )
}

const FailPublish = () => {
  const { lastPublish, publish } = usePublish({
    token: 'fail',
    message: 'fail',
  })

  return (
    <div>
      {lastPublish ? <p>Publishing success</p> : <p>Publication failure</p>}
      <button onClick={publish} type="button">
        Publish
      </button>
    </div>
  )
}

const TypedPublish = () => {
  const [count, setCount] = useState(0)

  // `message` is type-checked as number (from TypedEvents['counter:set']).
  usePublish({
    bus: typedBus,
    token: 'counter:set',
    message: count,
    isAutomatic: true,
  })

  return (
    <button onClick={() => setCount(c => c + 1)} type="button">
      Increment typed counter
    </button>
  )
}

const TypedReceiveViaSubscribe = () => {
  const [value, setValue] = useState(0)

  // `received` is inferred as number — no cast.
  useSubscribe({
    bus: typedBus,
    token: 'counter:set',
    handler: (_token, received) => setValue(received),
  })

  return (
    <div>
      <h2>Typed counter (useSubscribe):</h2>
      <p>{value}</p>
    </div>
  )
}

const TypedReceiveViaBusState = () => {
  // Reads the latest value as state — available on mount from the retained bus.
  const count = useBusState({
    bus: typedBus,
    token: 'counter:set',
    initialValue: 0,
  })

  return (
    <div>
      <h2>Typed counter (useBusState):</h2>
      <p>{count}</p>
    </div>
  )
}

const App = () => (
  <div className="app">
    <div>
      <h1>External section</h1>
      <AutoExternalMessages />
      <ManualExternalMessages />
    </div>
    <div>
      <h1>Manual section</h1>
      <ReceiveManualPublish />
      <ManualPublishMessages />
    </div>
    <div>
      <h1>Automatic section</h1>
      <ReceiveAutoPublish />
      <AutoPublishMessages />
    </div>
    <div>
      <h1>Fail section</h1>
      <FailPublish />
    </div>
    <div>
      <h1>Typed bus section</h1>
      <TypedReceiveViaSubscribe />
      <TypedReceiveViaBusState />
      <TypedPublish />
    </div>
  </div>
)
export default App
