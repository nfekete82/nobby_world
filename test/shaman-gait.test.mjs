import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PNG} from 'pngjs'
import {alternateShamanFeet,GAIT_PHASES} from '../scripts/shaman-gait.mjs'
import registry from '../src/art/registry.json' with {type:'json'}

const ink=(png,frame,row,x,y,r,g,b)=>{
 const at=((row*192+y)*png.width+frame*192+x)*4
 png.data.set([r,g,b,255],at)
}
const hasFootAt=(png,frame,row,side,y)=>{
 const [from,to]=side==='left'?[80,95]:[96,113]
 for(let x=from;x<=to;x++)
  if(png.data[((row*192+y)*png.width+frame*192+x)*4+3]===255)return true
 return false
}

test('the gait has two planted-right, two planted-left and two passing phases',()=>{
 assert.deepEqual(GAIT_PHASES.map(p=>p.lead),
  ['right','right','passing','left','left','passing'])
 assert.ok(GAIT_PHASES[1].leftLift>GAIT_PHASES[1].rightLift)
 assert.ok(GAIT_PHASES[4].rightLift>GAIT_PHASES[4].leftLift)
 assert.equal(GAIT_PHASES[1].mirror,false)
 assert.equal(GAIT_PHASES[4].mirror,true)
})

test('native pixel feet alternate: first right planted, then left planted, in both rows',()=>{
 const mock=new PNG({width:1152,height:384})
 for(let row=0;row<2;row++)for(let frame=0;frame<6;frame++){
  for(let y=80;y<116;y++)for(let x=82;x<111;x++)
   ink(mock,frame,row,x,y,44+frame,78,92)
  for(let y=119;y<133;y++){
   for(let x=84;x<94;x++)ink(mock,frame,row,x,y,45,68,114)
   for(let x=99;x<109;x++)ink(mock,frame,row,x,y,112,81,51)
  }
 }
 const out=alternateShamanFeet(mock)
 for(let row=0;row<2;row++){
  assert.equal(hasFootAt(out,1,row,'right',132),true)
  assert.equal(hasFootAt(out,1,row,'left',132),false)
  assert.equal(hasFootAt(out,4,row,'left',132),true)
  assert.equal(hasFootAt(out,4,row,'right',132),false)
  for(let frame=0;frame<6;frame++)
   for(let y=0;y<116;y++)for(let x=0;x<192;x++){
    const at=((row*192+y)*out.width+frame*192+x)*4
    assert.deepEqual(out.data.subarray(at,at+4),mock.data.subarray(at,at+4),
     'head/staff/torso changed')
   }
 }
})
test('compiled shaman sprite contains distinct leg silhouettes and keeps native geometry',()=>{
 const a=registry.assets.shaman
 const image=PNG.sync.read(fs.readFileSync('public/'+a.animations.walk.image))
 assert.deepEqual([image.width,image.height],[1152,384])
 assert.equal(a.animations.walk.fps,12)
 assert.deepEqual(a.foot,[96,132])
 for(let row=0;row<2;row++){
  const footSignatures=new Set()
  for(let frame=0;frame<6;frame++){
   let shape=''
   for(let y=119;y<=132;y++)for(let x=78;x<=114;x++){
    const at=((row*192+y)*image.width+frame*192+x)*4
    shape+=image.data[at+3]?'1':'0'
   }
   footSignatures.add(shape)
  }
  assert.ok(footSignatures.size>=4,
   'still repeating the same right-foot-forward silhouette in row '+row)
 }
})
