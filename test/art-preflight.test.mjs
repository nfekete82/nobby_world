import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preflight } from '../scripts/preflight-art.mjs'

test('all shipped Tiny Swords sprites and map tile IDs are structurally valid', () => {
  const result = preflight()
  assert.ok(result.assets >= 21, 'expected all configured actor and prop types')
  assert.ok(result.animations >= result.assets, 'each asset requires at least one animation')
  assert.deepEqual(result.maps.map(m => m.name), ['simplemap.tmx', 'wald.tmx'])
  assert.ok(result.maps.every(m => m.layers >= 5))
})
