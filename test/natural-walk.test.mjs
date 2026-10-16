import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PNG} from 'pngjs'
import {ensureNaturalShamanWalk,WALK_CADENCE_FPS} from '../scripts/natural-walk.mjs'
import {NATIVE_SHAMAN_STATES} from '../scripts/native-shaman.mjs'
import registry from '../src/art/registry.json' with {type:'json'}

test('normal build copies all reviewed native character states unchanged',()=>{
 ensureNaturalShamanWalk()
 for(const [state,spec] of Object.entries(NATIVE_SHAMAN_STATES)){
  const source=PNG.sync.read(fs.readFileSync('art/generated-source/expansion/'+(state==='walk'?'shaman-run.png':`shaman-native-${state}.png`)))
  const asset=registry.assets.shaman.animations[state]
  assert.equal(asset.frames,spec.poses.length)
  assert.deepEqual(PNG.sync.read(fs.readFileSync('public/'+asset.image)).data,source.data)
 }
 assert.equal(registry.assets.shaman.animations.walk.fps,WALK_CADENCE_FPS)
 const raw=PNG.sync.read(fs.readFileSync('public/tiny-swords/expansion/shaman-walk.png'))
 assert.deepEqual(raw.data,PNG.sync.read(fs.readFileSync('art/generated-source/expansion/shaman-run.png')).data)
})
