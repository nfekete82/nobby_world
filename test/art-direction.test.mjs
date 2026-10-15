import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkArtDirection } from '../scripts/check-art-direction.mjs'

test('art direction guard pins native pack masters and validates authored pixel references', () => {
  const result = checkArtDirection()
  assert.ok(result.nativeMasterReferences >= 5)
  assert.ok(result.authoredIdentityAndBiomeReferences >= 4)
})
