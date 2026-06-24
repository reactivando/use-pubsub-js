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

test('e2e CJS: a throwing subscriber does not crash the process', async () => {
  // If delivery re-threw (pre-2.0), the setTimeout throw would be an uncaught
  // exception and node --test would fail the whole run.
  const errors = []
  const bus = createPubSub({ onError: (err) => errors.push(err) })
  const after = []
  bus.subscribe('boom', () => {
    throw new Error('kaboom')
  })
  bus.subscribe('boom', () => after.push(1))
  bus.publish('boom', null)
  await new Promise((resolve) => setTimeout(resolve, 10))

  assert.equal(after.length, 1, 'other subscribers still run after a throw')
  assert.equal(errors.length, 1, 'onError received the thrown error')
})

test('e2e CJS: a throwing subscriber on the PubSub singleton does not crash', async () => {
  const originalError = console.error
  const logged = []
  console.error = (...args) => logged.push(args)
  try {
    const after = []
    PubSub.subscribe('singleton-boom', () => {
      throw new Error('kaboom')
    })
    PubSub.subscribe('singleton-boom', () => after.push(1))
    PubSub.publish('singleton-boom', null)
    await new Promise((resolve) => setTimeout(resolve, 10))
    PubSub.clearAllSubscriptions()

    assert.equal(after.length, 1, 'other singleton subscribers still run')
    assert.ok(logged.length >= 1, 'default sink (console.error) got the error')
  } finally {
    console.error = originalError
  }
})
