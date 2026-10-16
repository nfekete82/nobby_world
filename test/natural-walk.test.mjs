import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PNG} from 'pngjs'
import {stabilizeShamanWalk} from '../scripts/natural-walk.mjs'
import registry from '../src/art/registry.json' with {type:'json'}

test('shaman gait keeps the upper body calm while legs retain six real strides',()=>{
 const art=registry.assets.shaman
 const stand=PNG.sync.read(fs.readFileSync('public/'+art.animations.stand.image))
 const walk=PNG.sync.read(fs.readFileSync('public/'+art.animations.walk.image))
 assert.deepEqual([stand.width,stand.height],[1152,384])
 assert.deepEqual([walk.width,walk.height],[1152,384])
 assert.equal(art.animations.walk.fps,8)
 assert.equal(art.animations.walk.frames,6)
 const recomposed=stabilizeShamanWalk(stand,walk)
 // Idempotent: compiling the walk again is pixel-for-pixel identical.
 assert.deepEqual(recomposed.data,walk.data)
 for(let row=0;row<2;row++){
  let legDeltas=0
  for(let f=0;f<6;f++){
   for(let y=0;y<116;y++)for(let x=0;x<192;x++){
    const stable=((row*192+y)*stand.width+x)*4
    const moving=((row*192+y)*walk.width+f*192+x)*4
    assert.equal(walk.data[moving+3],stand.data[stable+3],
     'upper-body alpha wobbles at '+row+'/'+f+'/'+x+'/'+y)
   }
   for(let y=117;y<134;y++)for(let x=75;x<=117;x++){
    const a=((row*192+y)*walk.width+x)*4
    const b=((row*192+y)*walk.width+f*192+x)*4
    if(walk.data[a+3]!==walk.data[b+3]||walk.data[a]!==walk.data[b])legDeltas++
   }
  }
  assert.ok(legDeltas>0,'no leg animation in direction row '+row)
 }
})
