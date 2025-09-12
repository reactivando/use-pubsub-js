import PubSub from 'pubsub-js'

export const PublishService = {
  interval: undefined as ReturnType<typeof setInterval> | undefined,
  publish(token: string) {
    this.interval = setInterval(() => {
      PubSub.publish(token, 'message')
    }, 5000)
  },
  clear() {
    if (this.interval) {
      clearInterval(this.interval)
    }
  },
}
