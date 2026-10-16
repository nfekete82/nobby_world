import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PNG} from 'pngjs'
import {copyAuthoredShamanWalk,GAIT_PHASES} from '../scripts/shaman-gait.mjs'
import registry from '../src/art/registry.json' with {type:'json'}
const read=file=>PNG.sync.read(fs.readFileSync(file))
const actual=()=>read('public/'+registry.assets.shaman.animations.walk.image)
const pixel=(p,f,r,x,y)=>Array.from(p.data.subarray(((r*192+y)*p.width+f*192+x)*4,((r*192+y)*p.width+f*192+x)*4+4))
const outline=[22,28,46,255]
function contactOracle(p){
 for(let row=0;row<2;row++){
  // Independently reviewed original Monk contacts: front-right in pose 1,
  // front-left in pose 3. Passing poses have the native short airborne phase.
  for(const [frame,lo,hi] of [[0,106,110],[2,90,94]])
   for(let x=lo;x<=hi;x++)assert.deepEqual(pixel(p,frame,row,x,133),outline,'wrong contact toe '+row+'/'+frame)
  for(let x=78;x<=99;x++)assert.equal(pixel(p,0,row,x,133)[3],0,'left boot stayed planted in right contact')
  for(let x=100;x<=118;x++)assert.equal(pixel(p,2,row,x,133)[3],0,'right boot stayed planted in left contact')
  for(const frame of [1,3])for(let x=76;x<=118;x++)
   assert.equal(pixel(p,frame,row,x,131)[3],0,'passing foot forced onto ground')
 }
}
test('real native Monk toes alternate right/left contact in both facing rows',()=>contactOracle(actual()))
test('contact oracle rejects a repeated leading-foot defect',()=>{
 const p=actual()
 for(let row=0;row<2;row++)for(let y=120;y<=135;y++)for(let x=76;x<=118;x++){
  const from=((row*192+y)*p.width+x)*4,to=((row*192+y)*p.width+384+x)*4
  p.data.set(p.data.subarray(from,from+4),to)
 }
 assert.throws(()=>contactOracle(p))
})
test('every native robe/boot pixel keeps original shape and pose, with palette edits only',()=>{
 const source=read('public/tiny-swords/Units/Blue Units/Monk/Run.png'),p=actual()
 const palette=JSON.parse(fs.readFileSync('art/generated-source/expansion/shaman-native-patches.json')).palette
 const recolor={'72,88,132':palette.d,'70,151,172':palette.t,'94,84,85':palette.b,'151,123,107':palette.h}
 for(let row=0;row<2;row++)for(let f=0;f<4;f++)for(let y=119;y<=135;y++)for(let x=76;x<=118;x++){
  const original=pixel(source,f,0,x,y),expected=original[3]===255?(recolor[original.slice(0,3).join(',')]||original):[0,0,0,0]
  const got=pixel(p,f,row,x,y)
  if(!expected[3])assert.equal(got[3],0,'silhouette changed')
  else assert.deepEqual(got,expected,`native lower pose modified ${row}/${f}/${x}/${y}`)
 }
})
test('original four-pose Monk geometry and unchanged collision/anchor survive compilation',()=>{
 const p=actual(),a=registry.assets.shaman
 assert.deepEqual([p.width,p.height],[768,384])
 assert.deepEqual(a.frame,[192,192]);assert.deepEqual(a.foot,[96,132]);assert.deepEqual(a.hitbox,[32,24])
 assert.equal(a.animations.walk.frames,4);assert.equal(a.animations.walk.fps,12)
 assert.deepEqual(GAIT_PHASES.map(p=>p.lead),['right','passing','left','passing'])
 assert.deepEqual(copyAuthoredShamanWalk(p).data,p.data)
 assert.throws(()=>copyAuthoredShamanWalk(new PNG({width:192,height:192})))
})
test('4→1 wrap restores right contact after the left passing phase',()=>{
 const p=actual()
 for(let row=0;row<2;row++){
  assert.deepEqual(pixel(p,3,row,110,130),outline)
  assert.deepEqual(pixel(p,0,row,108,133),outline)
  assert.equal(pixel(p,3,row,108,133)[3],0)
  assert.equal(pixel(p,0,row,92,133)[3],0)
 }
})
