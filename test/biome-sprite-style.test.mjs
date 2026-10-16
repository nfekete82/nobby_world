import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PNG} from 'pngjs'
import {BIOME_PROP_SPECS,ensureBiomeProps} from '../scripts/biome-props.mjs'

const root='public/tiny-swords'
const illustrated=['desert-cactus','desert-cactus-small','desert-agave',
 'desert-prickly-pear','desert-house','desert-tent','desert-temple',
 'desert-shrub','desert-rock']
const load=file=>PNG.sync.read(fs.readFileSync(file))

test('nine real illustrated sprite files are committed and used verbatim',()=>{
 ensureBiomeProps()
 for(const id of illustrated){
  const source=load(`${root}/illustrated/${id}.png`)
  const compiled=load(`${root}/biomes/${id}.png`)
  const [width,height]=BIOME_PROP_SPECS[id]
  assert.deepEqual([source.width,source.height],[width,height],id+' dimensions')
  assert.deepEqual(source.data,compiled.data,id+' image was replaced by a fallback')
 }
})

test('all biome sprite frames are native-sized, transparent, shaded and registered',()=>{
 ensureBiomeProps()
 const registry=JSON.parse(fs.readFileSync('src/art/registry.json','utf8'))
 for(const [id,[w,h]] of Object.entries(BIOME_PROP_SPECS)){
  const image=load(`${root}/biomes/${id}.png`)
  assert.deepEqual([image.width,image.height],[w,h],id)
  const asset=registry.assets[id]
  assert.equal(asset.kind,'prop')
  assert.deepEqual(asset.frame,[w,h])
  assert.ok(fs.existsSync('public/'+asset.animations.stand.image))
  const animated=load('public/'+asset.animations.stand.image)
  assert.equal(animated.width,w*asset.animations.stand.frames)
  assert.equal(animated.height,h)
  let painted=0,transparent=0
  const colors=new Set()
  for(let i=0;i<image.data.length;i+=4){
   const a=image.data[i+3]
   if(a===255){
    painted++
    colors.add(image.data[i]+','+image.data[i+1]+','+image.data[i+2])
   }else if(a===0)transparent++
   else assert.fail(id+': expected pixel-perfect binary alpha')
  }
  assert.ok(painted>150,id+' lacks visible pixels')
  assert.ok(transparent>100,id+' lacks transparent padding')
  assert.ok(colors.size>=5,id+' lacks visible shading')
 }
})

test('large illustrated buildings maintain proper foot anchors and stable collision boxes',()=>{
 const registry=JSON.parse(fs.readFileSync('src/art/registry.json','utf8'))
 for(const id of ['desert-house','desert-tent','desert-temple']){
  const a=registry.assets[id]
  assert.equal(a.solid,true)
  assert.equal(a.foot[0],a.frame[0]/2)
  assert.equal(a.foot[1],187)
  assert.ok(a.hitbox[0]>=80)
 }
})
