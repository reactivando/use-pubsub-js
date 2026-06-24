import PubSub from 'pubsub-js'
import { usePublish } from './hooks/usePublish'
import { useSubscribe } from './hooks/useSubscribe'

export { PubSub, usePublish, useSubscribe }

export default { PubSub, useSubscribe, usePublish }
