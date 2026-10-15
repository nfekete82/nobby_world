import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findRoute, unpackNavigation, isBlocked } from '../src/navigation/pathfinding.mjs'

function grid(cols, rows, blocks=[]){
 const bits=new Uint8Array(Math.ceil(cols*rows/8))
 for(const [x,y] of blocks){const n=y*cols+x;bits[n>>3]|=1<<(n&7)}
 return unpackNavigation({cell:16,cols,rows,blocked:Buffer.from(bits).toString('hex')})
}
function checkEveryCell(nav,from,waypoints){
 let prev=from
 for(const target of waypoints){
  const dx=target.x-prev.x,dy=target.y-prev.y
  assert.ok(dx===0||dy===0||Math.abs(dx)===Math.abs(dy),'only eight directions')
  const sx=Math.sign(dx),sy=Math.sign(dy),steps=Math.max(Math.abs(dx),Math.abs(dy))/16
  assert.equal(steps,Math.floor(steps),'path remains on tile grid')
  let x=prev.x/16,y=prev.y/16
  for(let i=0;i<steps;i++){
   if(sx&&sy){
    assert.equal(isBlocked(nav,x+sx,y),false,'must clear horizontal side')
    assert.equal(isBlocked(nav,x,y+sy),false,'must clear vertical side')
   }
   x+=sx;y+=sy
   assert.equal(isBlocked(nav,x,y),false,'must not cross a solid tile')
  }
  prev=target
 }
}
test('open terrain yields a direct 45-degree diagonal',()=>{
 const nav=grid(10,10)
 const path=findRoute(nav,{x:16,y:16},{x:96,y:96})
 assert.deepEqual(path,[{x:96,y:96}])
 checkEveryCell(nav,{x:16,y:16},path)
})
test('diagonal cannot pass through corners with blocked adjoining tiles',()=>{
 const nav=grid(10,10,[[2,1],[1,2]])
 const from={x:16,y:16},path=findRoute(nav,from,{x:32,y:32})
 assert.ok(path.length,'safe route around the corner exists')
 checkEveryCell(nav,from,path)
 assert.notDeepEqual(path[0],{x:32,y:32},'cannot enter diagonal corner directly')
})
test('A* finds a safe way through a narrow gap',()=>{
 const blocked=Array.from({length:8},(_,y)=>[4,y]).filter(([,y])=>y!==6)
 const nav=grid(12,9,blocked),from={x:16,y:16}
 const route=findRoute(nav,from,{x:160,y:16})
 assert.ok(route.length>=2)
 assert.deepEqual(route.at(-1),{x:160,y:16})
 checkEveryCell(nav,from,route)
})
test('blocked and disconnected targets stay on accessible ground',()=>{
 const wall=Array.from({length:8},(_,y)=>[4,y])
 const nav=grid(8,8,wall),from={x:16,y:16}
 const path=findRoute(nav,from,{x:96,y:16})
 assert.ok(path.length)
 assert.ok(path.every(p=>p.x<64))
 checkEveryCell(nav,from,path)
 const forbidden=findRoute(nav,from,{x:64,y:64})
 checkEveryCell(nav,from,forbidden)
})
test('invalid targets are safely ignored',()=>{
 const nav=grid(5,5)
 assert.deepEqual(findRoute(nav,{x:0,y:0},{x:0,y:0}),[])
 assert.deepEqual(findRoute(nav,{x:NaN,y:0},{x:32,y:0}),[])
 assert.throws(()=>unpackNavigation({cell:16,cols:4,rows:4,blocked:'00'}),/bitmap/)
})
test('octile search favors smooth paths without unnecessary zigzags',()=>{
 const blocks=Array.from({length:8},(_,y)=>[4,y]).filter(([,y])=>y!==6)
 const nav=grid(12,9,blocks),from={x:16,y:16}
 const points=findRoute(nav,from,{x:160,y:16})
 assert.ok(points.length<=6,'excessive turns: '+JSON.stringify(points))
 checkEveryCell(nav,from,points)
})
