import { useState } from 'react'
import { usePublish, useSubscribe } from 'use-pubsub-js'

import { Token, TokenFour, TokenThree, TokenTwo } from './service/constants'
import { PublishService } from './service/publish'

PublishService.publish(Token)
PublishService.publish(TokenTwo)

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
  </div>
)
export default App
