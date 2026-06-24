const assert = require('node:assert')
const test = require('node:test')
const { PubSub, createPubSub, useSubscribe, usePublish } = require('use-pubsub-js')
const {
  PubSub: subpathPubSub,
  createPubSub: subpathCreatePubSub,
} = require('use-pubsub-js/pubsub')

test('e2e CJS: public named exports are present', () => {
  assert.notEqual(PubSub, undefined, 'PubSub should be defined')
  assert.equal(typeof createPubSub, 'function', 'createPubSub should be a function')
  assert.equal(typeof useSubscribe, 'function', 'useSubscribe should be a function')
  assert.equal(typeof usePublish, 'function', 'usePublish should be a function')
})

test('e2e CJS: ./pubsub subpath is usable', () => {
  assert.notEqual(subpathPubSub, undefined, 'subpath PubSub should be defined')
  assert.equal(typeof subpathCreatePubSub, 'function', 'subpath createPubSub')
})

test('e2e CJS: PubSub delivers a published message', async () => {
  const received = []
  PubSub.subscribe('e2e', (token, data) => received.push([token, data]))
  PubSub.publish('e2e', { hi: 1 })
  await new Promise((resolve) => setTimeout(resolve, 10))
  PubSub.clearAllSubscriptions()

  assert.equal(received.length, 1, 'handler should be called once')
  assert.equal(received[0][0], 'e2e', 'handler receives the token')
  assert.deepEqual(received[0][1], { hi: 1 }, 'handler receives the payload')
})
