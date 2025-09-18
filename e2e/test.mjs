import assert from 'node:assert'
import test from 'node:test'
import { PubSub, useSubscribe, usePublish } from 'use-pubsub-js'

test('e2e', () => {
  assert.notEqual(PubSub, undefined, 'PubSub should be defined')
  assert.notEqual(useSubscribe, undefined, 'useSubscribe should be defined')
  assert.notEqual(usePublish, undefined, 'usePublish should be defined')
})
