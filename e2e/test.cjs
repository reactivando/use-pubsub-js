const assert = require('node:assert')
const test = require('node:test')
const { PubSub, useSubscribe, usePublish } = require('use-pubsub-js')

test('e2e CJS', () => {
  assert.notEqual(PubSub, undefined, 'PubSub should be defined')
  assert.notEqual(useSubscribe, undefined, 'useSubscribe should be defined')
  assert.notEqual(usePublish, undefined, 'usePublish should be defined')
})
