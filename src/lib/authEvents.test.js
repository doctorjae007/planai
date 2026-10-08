import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldHandleAuthTransition } from './authEvents.js'

test('ignores auth events that can repeat when a tab regains focus', () => {
  assert.equal(shouldHandleAuthTransition('TOKEN_REFRESHED', 'teacher-1', 'teacher-1'), false)
  assert.equal(shouldHandleAuthTransition('SIGNED_IN', 'teacher-1', 'teacher-1'), false)
  assert.equal(shouldHandleAuthTransition('INITIAL_SESSION', 'teacher-1', 'teacher-1'), false)
})

test('handles real account transitions', () => {
  assert.equal(shouldHandleAuthTransition('SIGNED_IN', null, 'teacher-1'), true)
  assert.equal(shouldHandleAuthTransition('SIGNED_IN', 'teacher-1', 'teacher-2'), true)
  assert.equal(shouldHandleAuthTransition('SIGNED_OUT', 'teacher-1', null), true)
  assert.equal(shouldHandleAuthTransition('USER_UPDATED', 'teacher-1', 'teacher-1'), true)
  assert.equal(shouldHandleAuthTransition('PASSWORD_RECOVERY', 'teacher-1', 'teacher-1'), true)
})
