import { PubSub } from 'use-pubsub'

export const PublishService = {
  interval: undefined,
  publish: function (token) {
    this.interval = setInterval(() => {
      PubSub.publish(token, "message")
    }, 5000)
  },
  clear: function () {
    clearInterval(this.interval)
  }
}