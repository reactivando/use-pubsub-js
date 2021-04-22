import { PubSub } from 'use-pubsub'

export const PublishService = {
  interval: undefined,
  publish(token) {
    this.interval = setInterval(() => {
      PubSub.publish(token, 'message')
    }, 5000)
  },
  clear() {
    clearInterval(this.interval)
  },
}
