import {test} from 'node:test'
import assert from 'node:assert/strict'
import {BIOMES,BIOME_TILE_CATEGORIES,BIOME_OBJECT_CATEGORIES,objectBiome,tilesetBiome,objectCategory,visibleInBiome} from '../src/ui/editor-taxonomy.mjs'
import {walkabilityChanges,repairPaintedWalkways} from '../src/ui/terrain-rules.mjs'
const L=(name,gids)=>({name,gids})
test('biome palette categories are scoped',()=>{
 assert.deepEqual(BIOMES,['Wald','Wüste','Schnee'])
 assert.ok(BIOME_TILE_CATEGORIES.Wüste.includes('Übergänge'))
 assert.ok(BIOME_OBJECT_CATEGORIES.Wüste.includes('Kakteen'))
 assert.equal(objectBiome('desert-cactus'),'Wüste')
 assert.equal(objectBiome('snow-pine'),'Schnee')
 assert.equal(objectBiome('monster:ritter'),'Alle')
 assert.equal(objectCategory('desert-cactus'),'Kakteen')
 assert.equal(tilesetBiome('snow.tsx'),'Schnee')
 assert.ok(visibleInBiome('Alle','Wüste'))
 assert.ok(!visibleInBiome('Wald','Schnee'))
})
test('painting paths/bridges clears only the logical collision layer',()=>{
 const layers=[L('Wassergrund',[73,73]),L('Gelände',[0,12]),L('Wege',[56,0]),L('Wasser und Klippen · Kollision',[1,0])]
 assert.deepEqual(walkabilityChanges(layers,0,'Wege',56),[{name:'Wasser und Klippen · Kollision',index:0,gid:0}])
 assert.equal(walkabilityChanges(layers,0,'Wege',56,false).length,0)
 assert.equal(walkabilityChanges(layers,0,'Wassergrund',73).length,0)
 assert.equal(walkabilityChanges(layers,0,'Wege',0).length,0)
 assert.deepEqual(repairPaintedWalkways(layers),[{name:'Wasser und Klippen · Kollision',index:0,gid:0}])
 assert.deepEqual(layers[0].gids,[73,73])
})
test('existing painted walkways can be repaired without opening untouched water',()=>{
 const l=[L('Wege',[56,0,0,0]),L('Wüste',[0,228,0,0]),L('Brücke',[0,0,65,0]),L('Wasser und Klippen · Kollision',[1,1,1,1])]
 assert.deepEqual(repairPaintedWalkways(l).map(x=>x.index),[0,1,2])
})
