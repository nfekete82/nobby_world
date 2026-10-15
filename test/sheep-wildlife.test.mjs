import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PNG} from 'pngjs'
import {compileWorlds} from '../scripts/world-data.mjs'
import {makeSheepGrazingFrames,ensureSheepGraze,SHEEP_GRAZE_FRAMES,SHEEP_GRAZE_DIP} from '../scripts/sheep-art.mjs'
import {makePastureMask,unpackPasture,pastureHas,sheepStep,seedSheep} from '../src/wildlife/sheep-ai.mjs'
const L=(name,gids)=>({name,gids})

test('grazing is possible only on actual, collision-free grass, never on roads or desert',()=>{
 const grass=[12,12,12,12,0,12,12,12,12]
 const collision=[0,0,0,0,0,0,1,0,0]
 const desert=[0,0,0,0,0,228,0,0,0]
 const roads=[0,0,56,0,0,0,0,0,0]
 const mask=unpackPasture(makePastureMask(3,3,[
  L('Gelände',grass),L('Wasser und Klippen · Kollision',collision),
  L('Wüste',desert),L('Wege',roads)
 ],[{source:'grass.tsx',firstgid:2,count:54}]))
 assert.ok(pastureHas(mask,0,0))
 assert.ok(pastureHas(mask,1,0))
 assert.equal(pastureHas(mask,2,0),false,'visible path is not pasture')
 assert.equal(pastureHas(mask,1,1),false,'water without ground remains excluded')
 assert.equal(pastureHas(mask,2,1),false,'sand overlay excludes grass')
 assert.equal(pastureHas(mask,0,2),false,'blocked cliff/water excludes grass')
 assert.equal(pastureHas(mask,100,100),false)
})

test('autonomous sheep never leave their pasture or home radius',()=>{
 const width=9,height=9
 const mask=unpackPasture(makePastureMask(width,height,[
  L('Gelände',new Array(width*height).fill(12)),
  L('Wasser und Klippen · Kollision',new Array(width*height).fill(0))
 ],[{source:'grass.tsx',firstgid:2,count:54}]))
 const home={x:4*64,y:4*64}
 let pos={...home},seed=seedSheep('sheep-108'),moves=0,graze=0
 for(let step=0;step<400;step++){
  const action=sheepStep({mask,home,position:pos,seed,step,radius:2})
  seed=action.seed
  assert.ok(['graze','walk'].includes(action.kind))
  if(action.kind==='walk'){
   const vector={left:[-64,0],right:[64,0],up:[0,-64],down:[0,64]}[action.direction]
   pos={x:pos.x+vector[0],y:pos.y+vector[1]}
   assert.ok(Math.abs(pos.x-home.x)<=128&&Math.abs(pos.y-home.y)<=128)
   assert.ok(pastureHas(mask,pos.x/64,pos.y/64))
   moves++
  }else{graze++;assert.ok(action.duration>=2)}
 }
 assert.ok(moves>20,'sheep should take multiple small walks')
 assert.ok(graze>20,'sheep should pause frequently and graze')
})

test('a path blocked by game navigation prevents sheep movement through props',()=>{
 const layers=[L('Gelände',new Array(9).fill(12))]
 const mask=unpackPasture(makePastureMask(3,3,layers,[{source:'grass.tsx',firstgid:2,count:54}]))
 const cols=12,rows=12,bits=new Uint8Array(Math.ceil(cols*rows/8))
 // Block every neighbor in the navigation grid except the original tile.
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)
  if(x<4||x>7||y<4||y>7){const i=y*cols+x;bits[i>>3]|=1<<(i&7)}
 for(let n=0,seed=23;n<32;n++){
  const action=sheepStep({mask,nav:{cell:16,cols,rows,bits},home:{x:64,y:64},position:{x:64,y:64},seed,step:n})
  assert.equal(action.kind,'graze')
  seed=action.seed
 }
})

test('all authored maps have a finite grass-only wildlife mask; existing sheep can graze',()=>{
 const worlds=compileWorlds({writeOutput:false})
 let total=0
 for(const world of worlds){
  const mask=unpackPasture(world.pasture)
  assert.ok(mask,world.id+' missing pasture')
  assert.equal(mask.width,world.width/64)
  assert.equal(mask.height,world.height/64)
  const sheep=world.objects.filter(o=>o.kind==='prop'&&o.asset==='sheep')
  for(const animal of sheep){
   total++
   // A sheep that was manually placed on water stays in grazing-idle mode.
   const x=Math.floor(animal.x/64),y=Math.floor(animal.y/64)
   const planned=sheepStep({mask,home:animal,position:animal,seed:seedSheep(animal.id),step:2})
   if(!pastureHas(mask,x,y))assert.equal(planned.kind,'graze')
  }
 }
 assert.ok(total>=4,'the authored first island should contain its sheep')
})

test('grazing sprites preserve frame geometry and render a visible head-dip cycle',()=>{
 const src=PNG.sync.read(fs.readFileSync('public/tiny-swords/Terrain/Resources/Meat/Sheep/Sheep_Idle.png'))
 const output=makeSheepGrazingFrames(src)
 assert.equal(output.width,128*SHEEP_GRAZE_FRAMES)
 assert.equal(output.height,128)
 assert.deepEqual(SHEEP_GRAZE_DIP,[0,2,4,5,3,1])
 for(let n=0;n<SHEEP_GRAZE_FRAMES;n++){
  let alpha=0
  for(let y=0;y<128;y++)for(let x=0;x<128;x++)
   if(output.data[(y*output.width+n*128+x)*4+3]===255)alpha++
  assert.ok(alpha>300,'grazing frame '+n+' must remain visible')
 }
 ensureSheepGraze()
 const png=PNG.sync.read(fs.readFileSync('public/tiny-swords/biomes/sheep-graze.png'))
 assert.deepEqual([png.width,png.height],[output.width,output.height])
 const registry=JSON.parse(fs.readFileSync('src/art/registry.json','utf8'))
 assert.equal(registry.assets.sheep.animations.graze.fps,3)
 assert.equal(registry.assets.sheep.animations.graze.frames,6)
 const event=fs.readFileSync('src/modules/main/sheep-event.ts','utf8')
 assert.match(event,/infiniteMoveRoute/)
 assert.match(event,/Move\.wait/)
 assert.match(event,/setAnimation\('graze'/)
 assert.doesNotMatch(event,/setInterval\(/)
})
