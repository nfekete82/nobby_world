import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ARCANE_MANA, ARCANE_RANGE, ARCANE_COOLDOWN_MS,
 canCast,clearShot,enemyAt } from '../src/combat/arcane-rules.mjs'
import { unpackNavigation } from '../src/navigation/pathfinding.mjs'
import worlds from '../src/generated/worlds.json' with {type:'json'}
function nav(cols=40,rows=20,obstacles=[]){
 const bits=new Uint8Array(Math.ceil(cols*rows/8))
 for(const [x,y] of obstacles){const n=y*cols+x;bits[n>>3]|=1<<(n&7)}
 return unpackNavigation({cell:16,cols,rows,blocked:Buffer.from(bits).toString('hex')})
}
test('arcane bolt validates mana, cooldown, range and a living target',()=>{
 const grid=nav(),from={x:32,y:32},to={x:220,y:32}
 assert.equal(canCast({from,to,nav:grid,mana:ARCANE_MANA}),'ok')
 assert.equal(canCast({from,to,nav:grid,mana:ARCANE_MANA-1}),'mana')
 assert.equal(canCast({from,to,nav:grid,mana:ARCANE_MANA,cooldownReady:false}),'cooldown')
 assert.equal(canCast({from,to:{x:from.x+ARCANE_RANGE+1,y:from.y},nav:grid,mana:ARCANE_MANA}),'range')
 assert.equal(canCast({from,to:{x:NaN,y:32},nav:grid,mana:ARCANE_MANA}),'target')
 assert.ok(ARCANE_COOLDOWN_MS>=500)
})
test('water or walls obstruct magic; empty water-free corridors do not',()=>{
 const grid=nav(40,20,[[8,2],[9,2]]),from={x:32,y:32},to={x:224,y:32}
 assert.equal(clearShot(grid,from,to),false)
 assert.equal(canCast({from,to,nav:grid,mana:99}),'blocked')
 assert.equal(clearShot(grid,from,{x:32,y:224}),true)
})
test('monster click uses visible sprite extent, never dead or unrelated objects',()=>{
 const enemy={id:'monster',hp:80,x:240,y:180}
 assert.equal(enemyAt({x:256,y:161},[enemy])?.id,'monster')
 assert.equal(enemyAt({x:256,y:245},[enemy]),null)
 assert.equal(enemyAt({x:256,y:161},[{...enemy,hp:0}]),null)
 assert.equal(enemyAt({x:100,y:100},[enemy]),null)
})
test('real authored maps include clickable monsters and their navigation masks',()=>{
 for(const world of worlds){
  assert.ok(world.objects.filter(o=>o.kind==='monster').length>0)
  const grid=unpackNavigation(world.navigation)
  assert.ok(grid.cols>0&&grid.rows>0)
 }
})
