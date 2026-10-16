import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PNG} from 'pngjs'
import {ENEMIES} from '../src/art/enemies.mjs'
import {snakeStep} from '../src/wildlife/desert-snake.mjs'
const art=JSON.parse(fs.readFileSync('src/art/registry.json','utf8'))
test('shaman, skeleton and biome enemies ship complete native animations with binary alpha',()=>{
 for(const id of ['shaman','skeleton','desert-scorpion','desert-serpent','snow-polar-bear']){
  const a=art.assets[id]
  assert.deepEqual(a.frame,art.assets.hero.frame)
  assert.deepEqual(a.foot,art.assets.hero.foot)
  assert.deepEqual(a.hitbox,art.assets.hero.hitbox)
  for(const state of ['stand','walk','attack','hit','death',...(id==='shaman'?['heal']:id==='skeleton'?['spawn']:[])]){
   const s=a.animations[state],p=PNG.sync.read(fs.readFileSync('public/'+s.image))
   assert.equal(p.width,192*s.frames);assert.equal(p.height,192*(s.rows??1))
   assert.ok(s.frames>=2)
   for(let i=3;i<p.data.length;i+=4)assert.ok(p.data[i]===0||p.data[i]===255,id+'/'+state+' alpha')
   for(let row=0;row<(s.rows??1);row++)for(let f=0;f<s.frames;f++){
    let bottom=-1,painted=0
    for(let y=0;y<192;y++)for(let x=0;x<192;x++)if(p.data[((row*192+y)*p.width+f*192+x)*4+3]){
     painted++;bottom=Math.max(bottom,y)
     assert.ok(x>0&&x<191&&y>0&&y<191,id+'/'+state+' cropped frame')
    }
    assert.ok(painted>100,id+'/'+state+' empty frame')
    assert.ok(id==='shaman'?(state==='death'?bottom>=130&&bottom<=180:bottom===136):Math.abs(bottom-a.foot[1])<=1,
     id+'/'+state+' invalid ground/pose bounds '+bottom)
   }
  }
 }
 assert.equal(art.assets.shaman.animations.attack.rows,2)
 assert.equal(art.assets.shaman.animations.heal.rows,2)
})
test('animated biome foliage and fauna are registered and all enemy graphics resolve',()=>{
 for(const id of ['desert-cactus','desert-cactus-small','desert-prickly-pear','snow-fir','snow-shrub','snow-crystals','jungle-palm','jungle-tree','jungle-fern']){
  const a=art.assets[id];assert.equal(a.kind,'prop');assert.equal(a.animations.stand.frames,4)
  const png=PNG.sync.read(fs.readFileSync('public/'+a.animations.stand.image))
  assert.equal(png.width,a.frame[0]*4);assert.equal(png.height,a.frame[1])
 }
 for(const e of Object.values(ENEMIES))assert.ok(art.assets[e.graphic])
 assert.equal(art.assets['desert-snake'].kind,'prop')
 assert.equal(art.assets['desert-snake'].solid,false)
})
test('agave leaves have transparent padding on every border and no copied backdrop',()=>{
 const p=PNG.sync.read(fs.readFileSync('public/tiny-swords/illustrated/desert-agave.png'))
 assert.equal(p.width,64);assert.equal(p.height,64)
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const alpha=p.data[(y*64+x)*4+3]
  if(x<5||x>=59||y<5||y>=60)assert.equal(alpha,0,'agave touches image edge')
 }
})
test('desert ground is warm sand with native shoreline alpha and texture',()=>{
 const sand=PNG.sync.read(fs.readFileSync('src/tiled/tiny-swords/desert.png'))
 const grass=PNG.sync.read(fs.readFileSync('src/tiled/tiny-swords/grass.png'))
 let warm=0,painted=0;const colors=new Set()
 for(let i=0;i<sand.data.length;i+=4){
  assert.equal(sand.data[i+3],grass.data[i+3])
  if(!sand.data[i+3])continue
  painted++;if(sand.data[i]>sand.data[i+1]&&sand.data[i+1]>sand.data[i+2])warm++
  colors.add(sand.data.subarray(i,i+3).toString('hex'))
 }
 assert.ok(warm/painted>.99);assert.ok(colors.size>25)
})
test('neutral snakes roam within their home territory and reject blocked navigation',()=>{
 const nav={cell:16,cols:40,rows:40,bits:new Uint8Array(200)},home={x:256,y:256}
 let position={...home},walks=0
 for(let step=0;step<100;step++){
  const direction=snakeStep(nav,home,position,step)
  const vector={left:[-64,0],right:[64,0],up:[0,-64],down:[0,64]}[direction]
  if(vector){position={x:position.x+vector[0],y:position.y+vector[1]};walks++}
  assert.ok(Math.hypot(position.x-home.x,position.y-home.y)<=128)
 }
 assert.ok(walks>20)
 nav.bits.fill(255);assert.equal(snakeStep(nav,home,home,1),null)
})
test('biome trees match original visible scale and desert buildings keep padded native frames',()=>{
 const original=art.assets['tree-oak'].animations.stand.visibleBounds[0]
 const nativeHeight=original[3]-original[1]+1
 for(const id of ['snow-fir','jungle-palm','jungle-tree']){
  for(const b of art.assets[id].animations.stand.visibleBounds)
   assert.ok(b[3]-b[1]+1<=nativeHeight+1&&b[3]-b[1]+1>=nativeHeight*.95,id+' exceeds original tree scale')
 }
 for(const id of ['desert-house','desert-tent','desert-temple']){
  const a=art.assets[id],state=a.animations.stand,p=PNG.sync.read(fs.readFileSync('public/'+state.image))
  assert.deepEqual([p.width,p.height],a.frame)
  const [x0,y0,x1,y1]=state.visibleBounds[0]
  assert.ok(x0>=5&&y0>=5&&x1<p.width-5&&y1<p.height-1,id+' cropped roof or edge')
  assert.equal(y1,a.foot[1])
  for(let i=3;i<p.data.length;i+=4)assert.ok(p.data[i]===0||p.data[i]===255)
 }
})
test('skeleton has real rear actions and a collapsed final death pose in both directions',()=>{
 const a=art.assets.skeleton
 for(const state of Object.values(a.animations))assert.equal(state.rows,2)
 const death=a.animations.death,p=PNG.sync.read(fs.readFileSync('public/'+death.image))
 for(let row=0;row<2;row++){
  let top=192,bottom=-1
  for(let y=0;y<192;y++)for(let x=0;x<192;x++)if(p.data[((row*192+y)*p.width+(death.frames-1)*192+x)*4+3]){
   top=Math.min(top,y);bottom=Math.max(bottom,y)
  }
  assert.ok(bottom-top<40,'death ends in a collapsed bone pile, not a standing rear frame')
 }
})
