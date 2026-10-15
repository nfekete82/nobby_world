import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {compileWorlds} from '../scripts/world-data.mjs'
const art=JSON.parse(fs.readFileSync('src/art/registry.json','utf8'))

test('all physical buildings are solid in art registry and are present in authored worlds',()=>{
 const buildings=['house','house-large','barracks','monastery','tower','castle']
 for(const id of buildings){
  const a=art.assets[id]
  assert.equal(a.kind,'prop',id)
  assert.equal(a.solid,true,id)
  assert.ok(a.hitbox[0]>0&&a.hitbox[1]>0,id+' collider')
 }
 const props=compileWorlds().flatMap(w=>w.objects).filter(o=>o.kind==='prop')
 assert.ok(props.some(p=>buildings.includes(p.asset)),'at least one house in the actual maps')
})

test('props are created as fixed, nonpushable RPG-JS events with zero mass',()=>{
 const runtime=fs.readFileSync('src/modules/main/world-events.ts','utf8')
 const definition=runtime.split("if(object.kind==='prop')return {")[1]?.split('\n    return {')[0]
 assert.ok(definition,'props must have their own runtime definition')
 assert.match(definition,/pushable:false/)
 assert.match(definition,/mass:0/)
 assert.match(definition,/this\.setMass\(0\)/)
 assert.match(definition,/this\.canMove=false/)
 assert.match(definition,/this\.through=!\(asset as any\)\.solid/)
})
