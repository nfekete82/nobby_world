import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
 EDITOR_TILE_SIZE,EDITOR_MAX_SIDE_TILES,EDITOR_MAX_TOTAL_TILES,
 validateMapExpansion,expandLayerGrid,expansionFill
} from '../src/ui/map-resize.mjs'

test('map expansion preserves every original gid and fills new columns and rows',()=>{
 const old=[73,74,75,76,77,78]
 const larger=expandLayerGrid(old,3,2,5,4,0)
 assert.deepEqual(larger,[
  73,74,75,0,0,
  76,77,78,0,0,
  0,0,0,0,0,
  0,0,0,0,0
 ])
 assert.deepEqual(old,[73,74,75,76,77,78])
 assert.equal(larger.length,5*4)
})
test('expanded terrain defaults to safe water with matching impassable collisions',()=>{
 assert.equal(expansionFill('Wassergrund'),73)
 assert.equal(expansionFill('Wasser und Klippen · Kollision'),1)
 assert.equal(expansionFill('Gelände'),0)
 assert.equal(expansionFill('Wege'),0)
 assert.equal(expansionFill('Brücke'),0)
 assert.equal(expansionFill('Uferwellen'),0)
 const background=expandLayerGrid([73,73,73,73],2,2,3,3,expansionFill('Wassergrund'))
 const collisions=expandLayerGrid([0,0,0,1],2,2,3,3,expansionFill('Wasser und Klippen · Kollision'))
 assert.equal(background[2],73)
 assert.equal(background[8],73)
 assert.equal(collisions[2],1)
 assert.equal(collisions[8],1)
 assert.equal(collisions[0],0,'original land remains passable')
})
test('map editor respects 64px tiling and RPG-JS 100,000-node navigation cap',()=>{
 assert.equal(EDITOR_TILE_SIZE,64)
 assert.equal(EDITOR_MAX_SIDE_TILES,128)
 assert.equal(EDITOR_MAX_TOTAL_TILES,6250)
 assert.equal(validateMapExpansion(40,32,64,48),null)
 assert.equal(validateMapExpansion(40,32,96,64),null)
 assert.ok(validateMapExpansion(40,32,100,80))
 assert.ok(validateMapExpansion(40,32,128,32)===null)
 assert.ok(validateMapExpansion(40,32,129,32))
 assert.ok(validateMapExpansion(40,32,39,34))
 assert.ok(validateMapExpansion(40,32,40,32))
 assert.ok(validateMapExpansion(40,32,64.5,64))
 assert.throws(()=>expandLayerGrid([1,2],40,32,60,40),/Altes Raster/)
})
test('in-game editor exposes searchable sprite gallery, persistent placement, resizing and zoom',()=>{
 const source=fs.readFileSync('src/ui/web-editor.ts','utf8')
 const css=fs.readFileSync('src/ui/web-editor.css','utf8')
 assert.match(source,/private buildGallery\(\)/)
 assert.match(source,/private filterGallery\(\)/)
 assert.match(source,/\.chosenAsset=entry\.id/)
 assert.match(source,/this\.setTool\('object'\)/)
 assert.doesNotMatch(source,/this\.selected=el;this\.setTool\('select'\)/)
 assert.match(source,/private expandMap\(\)/)
 assert.match(source,/expandLayerGrid\(layer\.gids/)
 assert.match(source,/private fitMap\(\)/)
 assert.match(source,/private zoomAt\(factor:number\)/)
 assert.match(css,/\.we-object-gallery/)
 assert.match(css,/\.we-object-card/)
 assert.match(css,/\.we-resize-panel/)
})
