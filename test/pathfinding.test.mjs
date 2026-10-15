import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findRoute, unpackNavigation, isBlocked } from '../src/navigation/pathfinding.mjs'

function grid(cols, rows, blocks=[]){
 const bits=new Uint8Array(Math.ceil(cols*rows/8))
 for(const [x,y] of blocks){const n=y*cols+x;bits[n>>3]|=1<<(n&7)}
 return unpackNavigation({cell:16,cols,rows,blocked:Buffer.from(bits).toString('hex')})
}
test('A* never crosses a solid obstacle and does not cut diagonals',()=>{
 const wall=Array.from({length:8},(_,y)=>[4,y]).filter(([,y])=>y!==6)
 const nav=grid(12,9,wall)
 const route=findRoute(nav,{x:16,y:16},{x:160,y:16})
 assert.ok(route.length>2)
 assert.deepEqual(route.at(-1),{x:160,y:16})
 let old={x:16,y:16}
 for(const point of route){
  assert.ok(point.x===old.x||point.y===old.y,'no diagonal shortcut')
  const dx=Math.sign(point.x-old.x),dy=Math.sign(point.y-old.y)
  for(let x=old.x,y=old.y;x!==point.x||y!==point.y;){
   x+=dx*16;y+=dy*16
   assert.equal(isBlocked(nav,x/16,y/16),false,'route intersects solid tile')
  }
  old=point
 }
})
test('impassable or disconnected clicks stop on the nearest accessible land',()=>{
 const wall=Array.from({length:8},(_,y)=>[4,y])
 const nav=grid(8,8,wall)
 const route=findRoute(nav,{x:16,y:16},{x:96,y:16})
 assert.ok(route.length)
 assert.ok(route.every(p=>p.x<64))
 const blocked=findRoute(nav,{x:16,y:16},{x:64,y:64})
 assert.ok(blocked.every(p=>!isBlocked(nav,p.x/16,p.y/16)))
})
test('invalid routes are safely ignored',()=>{
 const nav=grid(5,5)
 assert.deepEqual(findRoute(nav,{x:0,y:0},{x:0,y:0}),[])
 assert.deepEqual(findRoute(nav,{x:NaN,y:0},{x:32,y:0}),[])
 assert.throws(()=>unpackNavigation({cell:16,cols:4,rows:4,blocked:'00'}),/bitmap/)
})
