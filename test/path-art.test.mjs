import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PNG} from 'pngjs'
import xml from 'xml-js'
import {
 preparePathArt,makeEarthyPath,makePathDetails,
 pathDetailGid,BASE_GID,VARIANT_BASE_TILES
} from '../scripts/path-art.mjs'

const list=v=>v==null?[]:Array.isArray(v)?v:[v]
test('path border loses pale blue without moving or changing any alpha pixel',()=>{
 const original=PNG.sync.read(fs.readFileSync('src/tiled/tiny-swords/path.png'))
 const darker=makeEarthyPath(original)
 assert.equal(darker.width,192);assert.equal(darker.height,192)
 let changed=0,blueReduced=0
 for(let i=0;i<original.data.length;i+=4){
  assert.equal(darker.data[i+3],original.data[i+3],'original path outline must stay pixel exact')
  if([0,1,2].some(c=>original.data[i+c]!==darker.data[i+c])){
   changed++
   if(darker.data[i+2]<original.data[i+2])blueReduced++
  }
 }
 assert.ok(changed>30,'blue rim was not recolored')
 assert.ok(blueReduced>10,'pale/blue edge not visibly reduced')
})

test('path variation atlas preserves 64px tile silhouettes and paints small natural details',()=>{
 preparePathArt()
 const earthy=PNG.sync.read(fs.readFileSync('src/tiled/tiny-swords/path-earthy.png'))
 const variants=PNG.sync.read(fs.readFileSync('src/tiled/tiny-swords/path-details.png'))
 assert.deepEqual([earthy.width,earthy.height],[192,192])
 assert.deepEqual([variants.width,variants.height],[320,128])
 let modified=0
 for(let row=0;row<2;row++)for(let col=0;col<5;col++){
  const tile=VARIANT_BASE_TILES[col]-56,ox=(tile%3)*64,oy=Math.floor(tile/3)*64
  let tileModified=0
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
   const i=((oy+y)*earthy.width+ox+x)*4
   const j=((row*64+y)*variants.width+col*64+x)*4
   assert.equal(variants.data[j+3],earthy.data[i+3],'decor may not change edges')
   if([0,1,2].some(c=>variants.data[j+c]!==earthy.data[i+c]))tileModified++
  }
  assert.ok(tileModified>0,'tile '+col+'/'+row+' must contain a leaf, pebble or stick')
  modified+=tileModified
 }
 assert.ok(modified>60,'decorations should be visible but understated')
})

test('authored path tile variations are spread only through the Wege layer',()=>{
 for(const name of ['simplemap','wald']){
  const map=xml.xml2js(fs.readFileSync('src/tiled/'+name+'.tmx','utf8'),{compact:true}).map
  assert.ok(list(map.tileset).some(t=>t._attributes.source==='path-details.tsx'&&Number(t._attributes.firstgid)===BASE_GID))
  const layers=list(map.layer)
  const ways=layers.find(t=>t._attributes.name==='Wege')
  const ids=ways.data._text.trim().split(/\s*,\s*/).map(Number)
  const count=ids.filter(id=>id>=BASE_GID&&id<BASE_GID+10).length
  assert.ok(count>=8&&count<75, name+' should use sparse decor, not replace every path tile')
  for(const layer of layers.filter(l=>l!==ways)){
   const all=layer.data._text.trim().split(/\s*,\s*/).map(Number)
   assert.ok(!all.some(id=>id>=BASE_GID&&id<BASE_GID+10),'non-path layer changed')
  }
 }
 assert.equal(pathDetailGid(56,2,3),56,'corners must be unchanged')
 assert.equal(pathDetailGid(0,2,3),0,'non-path IDs must be unchanged')
})
