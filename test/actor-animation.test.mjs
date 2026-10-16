import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {animationFrameIndices,trimTransparentBoundsFor,STABLE_IDLE_FRAMES} from '../src/art/animation-policy.mjs'
import registry from '../src/art/registry.json' with {type:'json'}

test('all playable classes and skeletons have calm, fixed-foot standing sequences',()=>{
 for(const [id,indices] of Object.entries(STABLE_IDLE_FRAMES)){
  const actor=registry.assets[id],idle=actor.animations.stand
  assert.equal(actor.kind,'actor',id)
  assert.deepEqual(actor.frame,[192,192])
  assert.deepEqual(actor.foot,[96,132])
  assert.deepEqual(animationFrameIndices(id,'stand',idle.frames),indices)
  const centers=indices.map(i=>(idle.visibleBounds[i][0]+idle.visibleBounds[i][2])/2)
  assert.ok(Math.max(...centers)-Math.min(...centers)<=2,id+' shifts horizontally between standing poses')
  assert.ok(centers.every(x=>Math.abs(x-actor.foot[0])<=3),id+' off-center standing pose')
 }
 assert.equal(registry.assets.shaman.animations.stand.fps,0.5)
 assert.equal(registry.assets.shaman.animations.walk.fps,12)
})

test('walk and all combat, casting and summoning frames stay complete',()=>{
 for(const id of ['hero','shaman','skeleton']){
  const actor=registry.assets[id]
  for(const [name,state] of Object.entries(actor.animations)){
   if(name==='stand')continue
   assert.deepEqual(animationFrameIndices(id,name,state.frames),
     Array.from({length:state.frames},(_,i)=>i),id+'/'+name)
  }
 }
 assert.throws(()=>animationFrameIndices('shaman','stand',1),/Invalid stable pose/)
})

test('actor cells stay full-size; trim only non-actor props',()=>{
 assert.equal(trimTransparentBoundsFor('actor'),false)
 assert.equal(trimTransparentBoundsFor('prop'),true)
 assert.equal(trimTransparentBoundsFor('prop','sheep'),false)
 const runtime=fs.readFileSync('src/art/sprites.ts','utf8')
 assert.match(runtime,/trimTransparentBounds:trimTransparentBoundsFor\(asset\.kind,id\)/)
 assert.match(runtime,/animationFrameIndices\(id,name,state\.frames\)/)
 assert.match(runtime,/anchor:\[footX\/width,footY\/height\]/)
 assert.match(runtime,/time:index\*60\/state\.fps/)
 assert.match(runtime,/time:frames\.length\*60\/state\.fps/)
})

test('recompiling authored shaman art retains the corrected calm idle rate',()=>{
 const source=fs.readFileSync('scripts/expansion-art.mjs','utf8')
 assert.match(source,/shaman:\{rows:6,height:70,states:\{stand:\[0,6,0\.5\]/)
})
