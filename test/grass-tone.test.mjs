import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { PNG } from 'pngjs'
import { ensureDarkerGrass, dimGrassPixels, GRASS_BRIGHTNESS } from '../scripts/darken-grass.mjs'

test('grass tint is subtle, alpha-preserving, and does not tint transparent backgrounds',()=>{
 assert.equal(GRASS_BRIGHTNESS,0.94)
 const source=new PNG({width:2,height:1})
 source.data.set([100,150,80,255,20,30,40,0])
 const dark=dimGrassPixels(source)
 assert.deepEqual([...dark.data],[94,141,75,255,20,30,40,0])
})
test('both Tiled grass and forest sheets regenerate at exactly the original dimensions',()=>{
 ensureDarkerGrass()
 for(const name of ['grass','forest']){
  const original=PNG.sync.read(fs.readFileSync('src/tiled/tiny-swords/'+name+'.png'))
  const dark=PNG.sync.read(fs.readFileSync('src/tiled/tiny-swords/'+name+'-darker.png'))
  assert.equal(dark.width,original.width,name+' width')
  assert.equal(dark.height,original.height,name+' height')
  let tinted=0
  for(let i=0;i<original.data.length;i+=4){
   assert.equal(dark.data[i+3],original.data[i+3],name+' alpha')
   for(let k=0;k<3;k++){
    assert.equal(dark.data[i+k],original.data[i+3]
      ?Math.round(original.data[i+k]*GRASS_BRIGHTNESS):original.data[i+k],
     name+' pixel '+i+' channel '+k)
   }
   if(original.data[i+3]>0&&dark.data[i+1]<original.data[i+1])tinted++
  }
  assert.ok(tinted>10000,name+' should visibly darken the meadow')
  const tsx=fs.readFileSync('src/tiled/'+name+'.tsx','utf8')
  assert.match(tsx,new RegExp(name+'-darker\\.png'))
 }
 assert.match(fs.readFileSync('src/tiled/path.tsx','utf8'),/tiny-swords\/path\.png/)
 assert.match(fs.readFileSync('src/tiled/water.tsx','utf8'),/tiny-swords\/water\.png/)
})
