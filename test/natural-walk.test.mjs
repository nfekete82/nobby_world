import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {PNG} from 'pngjs'
import {ensureNaturalShamanWalk,WALK_CADENCE_FPS} from '../scripts/natural-walk.mjs'
import {SHAMAN_REFERENCE} from '../scripts/reference-shaman.mjs'
import registry from '../src/art/registry.json' with {type:'json'}

const read=file=>PNG.sync.read(fs.readFileSync(file))
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex')

test('paint-over shaman walk is generated from the approved face and keeps a native-sized two-row atlas',()=>{
 assert.equal(registry.generation.shaman.source,SHAMAN_REFERENCE)
 const source=read(SHAMAN_REFERENCE)
 assert.deepEqual([source.width,source.height],[192,192])
 const walk=registry.assets.shaman.animations.walk
 assert.equal(walk.fps,WALK_CADENCE_FPS)
 assert.equal(walk.frames,4)
 const out=read('public/'+walk.image)
 assert.deepEqual([out.width,out.height],[768,384])
 for(const row of [0,1])for(let frame=0;frame<4;frame++){
  let bottom=-1,visible=0
  for(let y=0;y<192;y++)for(let x=0;x<192;x++){
   if(!out.data[((row*192+y)*out.width+frame*192+x)*4+3])continue
   visible++
   bottom=Math.max(bottom,y)
  }
  assert.ok(visible>150,'empty walk frame '+row+'/'+frame)
  assert.equal(bottom,136,'walk ground shifted at '+row+'/'+frame)
 }
})

test('regeneration preserves the original shipped Monk source assets and is deterministic',()=>{
 const monk=['Idle.png','Run.png','Heal.png'].map(x=>'public/tiny-swords/Units/Blue Units/Monk/'+x)
 const before=monk.map(hash)
 ensureNaturalShamanWalk()
 assert.deepEqual(monk.map(hash),before,'the Tiny Swords pack master was modified')
 const state=registry.assets.shaman.animations.walk
 const image='public/'+state.image
 const compiled=fs.readFileSync(image)
 ensureNaturalShamanWalk()
 assert.deepEqual(fs.readFileSync(image),compiled,'generated walk atlas is not repeatable')
})
