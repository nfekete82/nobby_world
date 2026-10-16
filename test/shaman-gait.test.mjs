import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PNG} from 'pngjs'
import registry from '../src/art/registry.json' with {type:'json'}
import {ensureNativeShaman,NATIVE_SHAMAN_STATES} from '../scripts/native-shaman.mjs'

const read=p=>PNG.sync.read(fs.readFileSync(p))
const states=['stand','walk','attack','heal','hit','death']
const hashFrame=(p,row,f)=>{
 const bytes=[]
 for(let y=0;y<192;y++)for(let x=0;x<192;x++){
  const i=((row*192+y)*p.width+f*192+x)*4
  bytes.push(...p.data.subarray(i,i+4))
 }
 return Buffer.from(bytes).toString('base64')
}

test('all shaman states paint over authentic Monk poses with unchanged geometry',()=>{
 const src=registry.generation.shaman
 assert.equal(src.source,'public/tiny-swords/Units/Blue Units/Monk/Idle.png')
 assert.equal(src.walkSource,'public/tiny-swords/Units/Blue Units/Monk/Run.png')
 assert.equal(src.healSource,'public/tiny-swords/Units/Blue Units/Monk/Heal.png')
 assert.deepEqual(registry.assets.shaman.frame,[192,192])
 assert.deepEqual(registry.assets.shaman.foot,[96,132])
 assert.deepEqual(registry.assets.shaman.hitbox,[32,24])
 for(const state of states){
  const a=registry.assets.shaman.animations[state],p=read('public/'+a.image)
  assert.equal(a.frames,NATIVE_SHAMAN_STATES[state].poses.length)
  assert.deepEqual([p.width,p.height],[a.frames*192,384],state)
  for(let row=0;row<2;row++)for(let f=0;f<a.frames;f++){
   let painted=0,minX=192,maxX=-1,bottom=-1
   for(let y=0;y<192;y++)for(let x=0;x<192;x++){
    const alpha=p.data[((row*192+y)*p.width+f*192+x)*4+3]
    assert.ok(alpha===0||alpha===255,state+' must have hard alpha')
    if(!alpha)continue
    painted++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);bottom=Math.max(bottom,y)
   }
   assert.ok(painted>100,state+' '+row+'/'+f+' empty')
   assert.ok(minX>=40&&maxX<192,state+' '+row+'/'+f+' outside frame')
   if(['stand','walk','heal','attack','hit'].includes(state))
    assert.ok(bottom>=125&&bottom<=150,state+' '+row+'/'+f+' footline '+bottom)
  }
 }
})

test('walking uses distinct leg silhouettes in both front and back rows',()=>{
 const a=registry.assets.shaman.animations.walk,p=read('public/'+a.image)
 const original=read(registry.generation.shaman.walkSource)
 for(let row=0;row<2;row++){
  const silhouettes=[]
  for(let f=0;f<4;f++){
   const alpha=[]
   let overlap=0,originalPixels=0
   for(let y=118;y<=135;y++)for(let x=76;x<=120;x++){
    const from=original.data[(y*original.width+f*192+x)*4+3]
    const to=p.data[((row*192+y)*p.width+f*192+x)*4+3]
    alpha.push(to>0?1:0)
    if(from===255){originalPixels++;if(to===255)overlap++}
   }
   assert.ok(originalPixels>10,'native source legs missing frame '+f)
   assert.ok(overlap/originalPixels>0.85,'native feet overwritten in '+row+'/'+f)
   silhouettes.push(alpha.join(''))
  }
  assert.ok(new Set(silhouettes).size>=3,'shaman slides rather than walks in row '+row)
 }
})

test('idle, walk and spell animations keep actual distinct frames',()=>{
 for(const state of ['stand','walk','heal']){
  const a=registry.assets.shaman.animations[state],p=read('public/'+a.image)
  for(let row=0;row<2;row++){
   const frames=Array.from({length:a.frames},(_,f)=>hashFrame(p,row,f))
   assert.ok(new Set(frames).size>=Math.min(a.frames,3),state+' repeated static poses '+row)
  }
 }
})

test('source rebuild is deterministic and leaves original licensed Monk files unchanged',()=>{
 const original=['Idle','Run','Heal'].map(s=>fs.readFileSync('public/tiny-swords/Units/Blue Units/Monk/'+s+'.png'))
 const copy=structuredClone(registry)
 const expected=Object.fromEntries(states.map(s=>[s,fs.readFileSync('public/'+registry.assets.shaman.animations[s].image)]))
 ensureNativeShaman(copy)
 for(let i=0;i<3;i++)assert.deepEqual(fs.readFileSync('public/tiny-swords/Units/Blue Units/Monk/'+['Idle','Run','Heal'][i]+'.png'),original[i])
 for(const s of states){
  assert.deepEqual(fs.readFileSync('public/'+registry.assets.shaman.animations[s].image),expected[s])
  assert.equal(copy.assets.shaman.animations[s].frames,registry.assets.shaman.animations[s].frames)
 }
})
