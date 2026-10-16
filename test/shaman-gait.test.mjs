import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PNG} from 'pngjs'
import registry from '../src/art/registry.json' with {type:'json'}
import {ensureReferenceShaman,SHAMAN_REFERENCE} from '../scripts/reference-shaman.mjs'
const read=p=>PNG.sync.read(fs.readFileSync(p))
const states=['stand','walk','attack','heal','hit','death']
test('paint-over source is pinned in the shaman registry and retains 192px cells',()=>{
 assert.equal(registry.generation.shaman.source,SHAMAN_REFERENCE)
 const source=read(SHAMAN_REFERENCE.startsWith('art/')?SHAMAN_REFERENCE:'art/'+SHAMAN_REFERENCE)
 assert.deepEqual([source.width,source.height],[192,192])
 assert.deepEqual(registry.assets.shaman.foot,[96,132])
 assert.deepEqual(registry.assets.shaman.hitbox,[32,24])
 assert.equal(registry.assets.shaman.animations.stand.frames,8)
})
test('every gameplay action has a two-direction paint-over sheet and nonempty frames',()=>{
 for(const state of states){
  const a=registry.assets.shaman.animations[state],p=read('public/'+a.image)
  assert.deepEqual([p.width,p.height],[a.frames*192,384],state)
  for(let row=0;row<2;row++)for(let frame=0;frame<a.frames;frame++){
   let count=0,minX=192,maxX=-1,bottom=-1
   for(let y=0;y<192;y++)for(let x=0;x<192;x++){
    const alpha=p.data[((row*192+y)*p.width+frame*192+x)*4+3]
    assert.ok(alpha===0||alpha===255,'authored alpha must be binary')
    if(alpha){count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);bottom=Math.max(bottom,y)}
   }
   assert.ok(count>150,state+' '+row+'/'+frame+' empty')
   assert.ok(minX>=45&&maxX<=180,state+' '+row+'/'+frame+' outside sprite margin')
   if(state==='stand'||state==='walk')assert.equal(bottom,136,state+' '+row+'/'+frame+' foot line')
  }
 }
})
test('idle cycle and running phase contain actual distinct poses, including rear row',()=>{
 for(const state of ['stand','walk']){
  const a=registry.assets.shaman.animations[state],p=read('public/'+a.image)
  for(let row=0;row<2;row++){
   const poses=[]
   for(let f=0;f<a.frames;f++){
    const bytes=[]
    for(let y=0;y<192;y++)for(let x=0;x<192;x++){
     const offset=((row*192+y)*p.width+f*192+x)*4
     bytes.push(...p.data.subarray(offset,offset+4))
    }
    poses.push(Buffer.from(bytes).toString('base64'))
   }
   assert.ok(new Set(poses).size>=Math.min(a.frames,3),state+' '+row+' phases too repetitive')
  }
 }
})
test('compiler regenerates all shaman sheets byte-identically and preserves class identity',()=>{
 const expected=Object.fromEntries(states.map(s=>[s,fs.readFileSync('public/'+registry.assets.shaman.animations[s].image)]))
 const copy=structuredClone(registry)
 ensureReferenceShaman(copy)
 for(const s of states){
  assert.deepEqual(fs.readFileSync('public/'+registry.assets.shaman.animations[s].image),expected[s],s+' reproducibility')
  assert.equal(copy.assets.shaman.animations[s].frames,registry.assets.shaman.animations[s].frames)
 }
 assert.equal(copy.assets.shaman.frame[0],192)
})
