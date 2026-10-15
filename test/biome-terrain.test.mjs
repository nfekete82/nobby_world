import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PNG} from 'pngjs'
import xml from 'xml-js'
import {ensureBiomeTerrain,recolorBiomePixels,BIOME_PALETTES} from '../scripts/biome-art.mjs'
import {TILE_CATEGORIES,tilesetCategory,layerForTileCategory,layerForTileset} from '../src/ui/editor-taxonomy.mjs'

test('biome sprites reuse the existing Tiny Swords tiles and preserve pixel alpha',()=>{
 const sample=new PNG({width:2,height:1})
 sample.data.set([100,150,75,255,20,30,40,0])
 const desert=recolorBiomePixels(sample,BIOME_PALETTES.desert)
 const snow=recolorBiomePixels(sample,BIOME_PALETTES.snow)
 assert.equal(desert.data[3],255)
 assert.deepEqual([...desert.data.slice(4,8)],[20,30,40,0])
 assert.notDeepEqual([...desert.data.slice(0,3)],[...snow.data.slice(0,3)])
 ensureBiomeTerrain()
 const source=PNG.sync.read(fs.readFileSync('src/tiled/tiny-swords/grass.png'))
 for(const name of Object.keys(BIOME_PALETTES)){
  const image=PNG.sync.read(fs.readFileSync('src/tiled/tiny-swords/'+name+'.png'))
  assert.equal(image.width,576)
  assert.equal(image.height,384)
  for(let p=3;p<image.data.length;p+=4)assert.equal(image.data[p],source.data[p],name+' opacity '+p)
  assert.ok(fs.readFileSync('src/tiled/'+name+'.tsx','utf8').includes('tiny-swords/'+name+'.png'))
 }
})

test('both Tiled maps preserve editable biome layers and valid GIDs in correct render order',()=>{
 const definitions=[['Wüste','desert.tsx',228],['Felsboden','rocky.tsx',282],['Schnee','snow.tsx',336]]
 for(const name of ['simplemap','wald']){
  const map=xml.xml2js(fs.readFileSync('src/tiled/'+name+'.tmx','utf8'),{compact:true}).map
  const layers=Array.isArray(map.layer)?map.layer:[map.layer]
  const tilesets=Array.isArray(map.tileset)?map.tileset:[map.tileset]
  const names=layers.map(l=>l._attributes.name)
  const width=Number(map._attributes.width),height=Number(map._attributes.height)
  assert.ok(names.indexOf('Gelände')<names.indexOf('Wüste'))
  assert.ok(names.indexOf('Schnee')<names.indexOf('Wege'))
  assert.ok(names.indexOf('Wege')<names.indexOf('Brücke'))
  for(const [label,file,gid] of definitions){
   const layer=layers.find(l=>l._attributes.name===label)
   assert.ok(layer,name+' '+label)
   assert.equal(Number(layer._attributes.width),width)
   assert.equal(Number(layer._attributes.height),height)
   const gids=String(layer.data._text).trim().split(/\s*,\s*/)
   assert.equal(gids.length,width*height)
   assert.ok(gids.every(value=>value==='0'||Number(value)>=gid&&Number(value)<gid+54))
   assert.ok(tilesets.some(item=>item._attributes.source===file&&Number(item._attributes.firstgid)===gid))
  }
 }
})

test('the palette selects biome layer but does not automatically clear other layers',()=>{
 for(const [label,file] of [['Wüste','desert.tsx'],['Felsboden','rocky.tsx'],['Schnee','snow.tsx']]){
  assert.ok(TILE_CATEGORIES.includes(label))
  assert.equal(tilesetCategory(file),label)
  assert.equal(layerForTileCategory(label),label)
  assert.equal(layerForTileset(file),label)
 }
 assert.equal(layerForTileset('bridge.tsx'),'Brücke')
 assert.equal(layerForTileset('water-background.tsx'),'Wassergrund')
 const editor=fs.readFileSync('src/ui/web-editor.ts','utf8')
 assert.ok(editor.includes('layerForTileset(sheet.source)'))
 assert.ok(editor.includes('const layer=this.layer[this.layerIndex],gid=erase?0:this.chosenGid'))
 assert.ok(!editor.includes('planTerrainPaint'))
})

test('green forest water preserves the original alpha and physical water collision',async()=>{
 const {ensureMossWater,mossWaterPixels}=await import('../scripts/moss-water.mjs')
 ensureMossWater()
 const original=PNG.sync.read(fs.readFileSync('src/tiled/tiny-swords/water.png'))
 const green=PNG.sync.read(fs.readFileSync('src/tiled/tiny-swords/water-moss.png'))
 assert.equal(green.width,64);assert.equal(green.height,64)
 assert.deepEqual(green.data,mossWaterPixels(original).data)
 for(let i=3;i<green.data.length;i+=4)assert.equal(green.data[i],original.data[i])
 for(const name of ['water','water-background']){
  assert.match(fs.readFileSync('src/tiled/'+name+'.tsx','utf8'),/water-moss\.png/)
 }
 assert.match(fs.readFileSync('src/tiled/water.tsx','utf8'),/name="collision" type="bool" value="true"/)
})
