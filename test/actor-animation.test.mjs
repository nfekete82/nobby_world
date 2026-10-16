import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {animationFrameIndices,trimTransparentBoundsFor,STABLE_IDLE_FRAMES} from '../src/art/animation-policy.mjs'
import {NATIVE_SHAMAN_STATES} from '../scripts/native-shaman.mjs'
import {PNG} from 'pngjs'
import registry from '../src/art/registry.json' with {type:'json'}

test('all playable classes and skeletons have calm, fixed-foot standing sequences',()=>{
 for(const [id,indices] of Object.entries(STABLE_IDLE_FRAMES)){
  const actor=registry.assets[id],idle=actor.animations.stand
  assert.equal(actor.kind,'actor',id)
  assert.deepEqual(actor.frame,[192,192])
  assert.deepEqual(actor.foot,[96,132])
  assert.deepEqual(animationFrameIndices(id,'stand',idle.frames),indices)
  // A long staff changes the silhouette envelope, not the body's anchor.
  const png=id==='shaman'?PNG.sync.read(fs.readFileSync('public/'+idle.image)):null
  const centers=indices.map(i=>{
   if(!png)return (idle.visibleBounds[i][0]+idle.visibleBounds[i][2])/2
   let sum=0,n=0
   for(let y=118;y<=125;y++)for(let x=70;x<=123;x++)if(png.data[(y*png.width+i*192+x)*4+3]){sum+=x;n++}
   return sum/n
  })
  assert.ok(Math.max(...centers)-Math.min(...centers)<=6,id+' shifts horizontally between standing poses')
  assert.ok(centers.every(x=>Math.abs(x-actor.foot[0])<=8),id+' off-center standing pose')
 }
 assert.equal(registry.assets.shaman.animations.stand.fps,1.5)
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
 assert.match(runtime,/trimTransparentBounds:trimTransparentBoundsFor\(asset\.kind,/)
 assert.match(runtime,/animationFrameIndices\(id,name,state\.frames,/)
 assert.match(runtime,/anchor:\[footX\/width,footY\/height\]/)
 assert.match(runtime,/index\*60\/state\.fps/)
 assert.match(runtime,/frames\.length\*60\/state\.fps/)
})

test('the playable shaman retains all original Monk walk poses and does not use the static paintover',()=>{
 assert.equal(NATIVE_SHAMAN_STATES.stand.fps,1.5)
 assert.deepEqual(NATIVE_SHAMAN_STATES.walk.poses,[0,1,2,3])
 assert.equal(registry.assets.shaman.animations.stand.frames,6)
 assert.equal(registry.generation.shaman.source,'public/tiny-swords/Units/Blue Units/Monk/Idle.png')
 const native=fs.readFileSync('scripts/native-shaman.mjs','utf8')
 assert.match(native,/authorNativeShaman\(\)/)
 assert.doesNotMatch(native,/ensureReferenceShaman/)
 const compiler=fs.readFileSync('scripts/expansion-art.mjs','utf8')
 assert.match(compiler,/if\(id==='shaman'\)\{ensureNativeShaman\(registry\);continue\}/)
})
