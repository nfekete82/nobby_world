import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PNG} from 'pngjs'
import {ensureBiomeProps,BIOME_PROP_SPECS} from '../scripts/biome-props.mjs'
import {ensureBiomeTerrain,tintBiomePath} from '../scripts/biome-art.mjs'
import {tilesetCategory,layerForTileset,tilesetBiome} from '../src/ui/editor-taxonomy.mjs'

test('desert and snow transition paths retain their transparent 3x3 64px grid',()=>{
 ensureBiomeTerrain()
 for(const kind of ['desert','snow']){
  const sheet=PNG.sync.read(fs.readFileSync('src/tiled/tiny-swords/'+kind+'-path.png'))
  const input=PNG.sync.read(fs.readFileSync('src/tiled/tiny-swords/path-earthy.png'))
  assert.equal(sheet.width,192)
  assert.equal(sheet.height,192)
  assert.equal(sheet.data.length,input.data.length)
  for(let i=3;i<sheet.data.length;i+=4)assert.equal(sheet.data[i],input.data[i],kind+' alpha '+i)
  const overlay=tintBiomePath(input,kind)
  assert.deepEqual(sheet.data,overlay.data)
  assert.equal(tilesetCategory(kind+'-path.tsx'),'Übergänge')
  assert.equal(tilesetBiome(kind+'-path.tsx'),kind==='desert'?'Wüste':'Schnee')
  assert.equal(layerForTileset(kind+'-path.tsx'),'Wege')
 }
})

test('generated cactus, houses, temple and snow pine are real nonempty transparent PNGs',()=>{
 ensureBiomeProps()
 const registry=JSON.parse(fs.readFileSync('src/art/registry.json','utf8'))
 for(const [name,[w,h]] of Object.entries(BIOME_PROP_SPECS)){
  const file='public/tiny-swords/biomes/'+name+'.png'
  const image=PNG.sync.read(fs.readFileSync(file))
  assert.equal(image.width,w,name+' width')
  assert.equal(image.height,h,name+' height')
  let opaque=0,transparent=0
  for(let i=3;i<image.data.length;i+=4){
   if(image.data[i]===255)opaque++
   if(image.data[i]===0)transparent++
  }
  assert.ok(opaque>150,name+' visible pixels')
  assert.ok(transparent>100,name+' transparent bounds')
  const asset=registry.assets[name]
  assert.ok(asset,name+' registered')
  assert.equal(asset.kind,'prop')
  assert.equal(asset.solid,true)
  assert.deepEqual(asset.frame,[w,h])
  assert.equal(asset.animations.stand.image,'tiny-swords/biomes/'+name+'.png')
 }
})

test('web editor adds optional overlays only to its in-memory TMX when loaded',()=>{
 const source=fs.readFileSync('src/ui/web-editor.ts','utf8')
 assert.match(source,/loadExtraPathTilesets\(map\)/)
 assert.match(source,/desert-path\.tsx/)
 assert.match(source,/snow-path\.tsx/)
 assert.match(source,/map\.insertBefore\(ref,map\.querySelector/)
 assert.match(source,/this\.sheet\.push\(\{first:gid/)
 assert.doesNotMatch(source,/writeFileSync\('src\/tiled/)
})
