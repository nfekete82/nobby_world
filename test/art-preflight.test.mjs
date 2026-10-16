import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preflight } from '../scripts/preflight-art.mjs'

test('all shipped Tiny Swords sprites and map tile IDs are structurally valid', () => {
  const result = preflight()
  assert.ok(result.assets >= 21, 'expected all configured actor and prop types')
  assert.ok(result.animations >= result.assets, 'each asset requires at least one animation')
  for(const name of ['simplemap.tmx','wald.tmx','sunscar.tmx','frostwild.tmx','verdant.tmx'])
    assert.ok(result.maps.some(m=>m.name===name))
  assert.ok(result.maps.every(m => m.layers >= 5))
})

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('..', import.meta.url))

test('Tiny Swords menu frames follow Vite BASE_URL instead of hardcoded root paths', () => {
  const css = fs.readFileSync(path.join(root, 'src/ui/tiny-swords.css'), 'utf8')
  const init = fs.readFileSync(path.join(root, 'src/ui/theme-assets.ts'), 'utf8')
  const client = fs.readFileSync(path.join(root, 'src/config/config.client.ts'), 'utf8')
  assert.doesNotMatch(css, /url\(['"]?\/tiny-swords\//)
  assert.match(css, /var\(--nobby-paper-frame\)/)
  assert.match(css, /var\(--nobby-wood-frame\)/)
  assert.match(init, /import\.meta\.env\.BASE_URL/)
  assert.match(init, /--nobby-paper-frame/)
  assert.match(init, /--nobby-wood-frame/)
  assert.match(client, /import '\.\.\/ui\/theme-assets'/)
})

test('healing cannot waste mana at full health and button is disabled without resources', () => {
  const player = fs.readFileSync(path.join(root, 'src/modules/main/player.ts'), 'utf8')
  const hud = fs.readFileSync(path.join(root, 'src/ui/hud.ts'), 'utf8')
  assert.match(player, /player\.hp<player\.param\[MAXHP\]/)
  assert.match(hud, /healButton\.disabled=!.+currentMana>=25/)
})
