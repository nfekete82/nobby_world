import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PNG} from 'pngjs'
import {ensureNaturalShamanWalk,WALK_CADENCE_FPS} from '../scripts/natural-walk.mjs'
import registry from '../src/art/registry.json' with {type:'json'}

test('normal build copies the authored twelve poses exactly to both game paths',()=>{
 ensureNaturalShamanWalk()
 const source=PNG.sync.read(fs.readFileSync('art/generated-source/expansion/shaman-run.png'))
 for(const file of ['public/tiny-swords/expansion/shaman-walk.png','public/'+registry.assets.shaman.animations.walk.image])
  assert.deepEqual(PNG.sync.read(fs.readFileSync(file)).data,source.data)
 assert.equal(registry.assets.shaman.animations.walk.fps,WALK_CADENCE_FPS)
 const upper=PNG.sync.read(fs.readFileSync('art/generated-source/expansion/shaman-run-upper.png'))
 for(let row=0;row<2;row++){
  const silhouettes=new Set()
  for(let f=0;f<6;f++){
   const signature=[]
   for(let y=0;y<110;y++)for(let x=0;x<192;x++){
    const i=((row*192+y)*source.width+f*192+x)*4
    assert.deepEqual(source.data.subarray(i,i+4),upper.data.subarray(i,i+4),'identity pixels changed')
    if(source.data[i+3])signature.push(x,y,source.data[i])
   }
   silhouettes.add(signature.join(','))
  }
  assert.equal(silhouettes.size,6,'secondary motion was frozen')
 }
})
