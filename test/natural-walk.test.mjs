import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { PNG } from 'pngjs'
import { stabilizeShamanWalk, WALK_CADENCE_FPS } from '../scripts/natural-walk.mjs'
import registry from '../src/art/registry.json' with {type:'json'}

test('shaman runs through six complete native-warrior-speed poses, both directions',()=>{
 const asset=registry.assets.shaman, stand=PNG.sync.read(fs.readFileSync('public/'+asset.animations.stand.image))
 const raw=PNG.sync.read(fs.readFileSync('public/tiny-swords/expansion/shaman-walk.png'))
 const derived=PNG.sync.read(fs.readFileSync('public/'+asset.animations.walk.image))
 assert.deepEqual([raw.width,raw.height],[1152,384])
 assert.deepEqual([derived.width,derived.height],[1152,384])
 assert.equal(WALK_CADENCE_FPS,12)
 assert.equal(asset.animations.walk.fps,WALK_CADENCE_FPS)
 assert.equal(asset.animations.walk.frames,6)
 assert.deepEqual(stabilizeShamanWalk(stand,raw).data,derived.data)
 for(let row=0;row<2;row++){
  const poses=new Set(),bounds=[]
  for(let frame=0;frame<6;frame++){
   let opaque=0,foot=0,weighted=0,count=0
   // Compare entire authored silhouette: head/arms/cloak must genuinely
   // animate, not be copied from the first standing frame every time.
   const torso=[]
   for(let y=0;y<192;y++)for(let x=0;x<192;x++){
    const at=((row*192+y)*derived.width+frame*192+x)*4
    if(derived.data[at+3]===0)continue
    assert.equal(derived.data[at+3],255,'fractional edge alpha')
    opaque++;foot=Math.max(foot,y)
    if(y>=80&&y<116&&x>=72&&x<=120){weighted+=x;count++}
    if(y<116)torso.push(x+':'+y+':'+derived.data[at]+':'+derived.data[at+1])
   }
   assert.ok(opaque>400,'empty frame '+row+'/'+frame)
   assert.ok(foot>=129&&foot<=134,'wrong ground contact '+row+'/'+frame+': '+foot)
   assert.ok(count>80,'torso too small')
   bounds.push(weighted/count)
   poses.add(torso.join('|'))
  }
  assert.ok(poses.size>=4,'frozen shaman upper body in row '+row)
  assert.ok(Math.max(...bounds)-Math.min(...bounds)<=3,
   'torso jitter exceeds 3 native pixels '+row)
 }
})
