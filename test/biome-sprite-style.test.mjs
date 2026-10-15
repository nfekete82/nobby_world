import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PNG} from 'pngjs'
import {BIOME_PROP_SPECS,ensureBiomeProps} from '../scripts/biome-props.mjs'
import {styledBiomeProps} from '../scripts/biome-props-style.mjs'

test('the ten biome props use the shared pixel renderer and native frames',()=>{
 ensureBiomeProps()
 const ids=Object.keys(BIOME_PROP_SPECS)
 assert.equal(ids.length,10)
 const art=JSON.parse(fs.readFileSync('src/art/registry.json','utf8'))
 for(const id of ids){
  const [width,height]=BIOME_PROP_SPECS[id]
  const image=PNG.sync.read(fs.readFileSync('public/tiny-swords/biomes/'+id+'.png'))
  assert.equal(image.width,width,id)
  assert.equal(image.height,height,id)
  assert.deepEqual(art.assets[id].frame,[width,height],id)
  assert.equal(art.assets[id].animations.stand.image,'tiny-swords/biomes/'+id+'.png')
  let painted=0,transparent=0
  const palette=new Set()
  for(let i=0;i<image.data.length;i+=4){
   const a=image.data[i+3]
   if(a===255){
    painted++
    palette.add(image.data[i]+','+image.data[i+1]+','+image.data[i+2])
   }else if(a===0)transparent++
   else assert.fail(id+' must have crisp binary alpha')
  }
  assert.ok(painted>150,id+' has too little painted detail')
  assert.ok(transparent>100,id+' has no transparent padding')
  assert.ok(palette.size>=5,id+' looks flat or unshaded')
 }
})
test('generated artwork is deterministic and pixel-perfect',()=>{
 for(const [id,[width,height]] of Object.entries(BIOME_PROP_SPECS)){
  const a=new PNG({width,height}),b=new PNG({width,height})
  styledBiomeProps[id](a);styledBiomeProps[id](b)
  assert.deepEqual(a.data,b.data,id)
 }
})
