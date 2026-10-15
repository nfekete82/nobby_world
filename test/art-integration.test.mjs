import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {PNG} from 'pngjs'
import xml from 'xml-js'
import {compileWorlds} from '../scripts/world-data.mjs'
const art=JSON.parse(fs.readFileSync('src/art/registry.json'))
const list=v=>v==null?[]:Array.isArray(v)?v:[v]

test('every registered animation has exact native cells, valid feet and nonempty frames',()=>{
 assert.equal(art.tileSize,64)
 for(const [id,a]of Object.entries(art.assets)){
  const [w,h]=a.frame
  assert.ok(a.foot[0]>=0&&a.foot[0]<=w&&a.foot[1]>=0&&a.foot[1]<=h,id)
  for(const [name,s]of Object.entries(a.animations)){
   const p=PNG.sync.read(fs.readFileSync('public/'+s.image))
   assert.equal(p.width,w*s.frames,`${id}/${name} width`);assert.equal(p.height,h,`${id}/${name} height`)
   for(let f=0;f<s.frames;f++){
    let pixels=0
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(p.data[(y*p.width+f*w+x)*4+3]>0)pixels++
    assert.ok(pixels>0,`${id}/${name}/${f} empty`)
   }
  }
 }
})
test('generated character sheets have binary alpha and a stable foot on every frame',()=>{
 for(const a of ['hero','female'].map(id=>art.assets[id]))for(const s of Object.values(a.animations)){
  const p=PNG.sync.read(fs.readFileSync('public/'+s.image)),[w,h]=a.frame
  for(let i=3;i<p.data.length;i+=4)assert.ok(p.data[i]===0||p.data[i]===255)
  for(let f=0;f<s.frames;f++){
   let bottom=-1
   for(let y=0;y<h;y++)for(let x=88;x<104;x++)if(p.data[(y*p.width+f*w+x)*4+3])bottom=Math.max(bottom,y)
   assert.ok(Math.abs(bottom-a.foot[1])<=1,`${s.image}/${f} foot ${bottom}`)
  }
 }
})
test('all map tilesets/images resolve and use the shared 64px grid without legacy art',()=>{
 for(const file of fs.readdirSync('src/tiled').filter(f=>f.endsWith('.tmx'))){
  const source=fs.readFileSync('src/tiled/'+file,'utf8'),map=xml.xml2js(source,{compact:true}).map
  assert.equal(Number(map._attributes.tilewidth),art.tileSize);assert.equal(Number(map._attributes.tileheight),art.tileSize)
  assert.doesNotMatch(source,/pipo|basechip|spritesheets\/hero/i)
  for(const t of list(map.tileset)){
   const file=path.resolve('src/tiled',t._attributes.source),ts=xml.xml2js(fs.readFileSync(file,'utf8'),{compact:true}).tileset
   const png=PNG.sync.read(fs.readFileSync(path.resolve(path.dirname(file),ts.image._attributes.source)))
   assert.equal(png.width,Number(ts.image._attributes.width));assert.equal(png.height,Number(ts.image._attributes.height))
  }
 }
})
test('actual water/cliff tiles and object footprints leave every encounter and portal reachable',()=>{
 for(const world of compileWorlds()){
  const map=xml.xml2js(fs.readFileSync(`src/tiled/${world.id}.tmx`,'utf8'),{compact:true}).map,T=art.tileSize
  const blocked=new Set(),rects=[]
  for(const t of list(map.tileset)){
   const ts=xml.xml2js(fs.readFileSync(path.resolve('src/tiled',t._attributes.source),'utf8'),{compact:true}).tileset
   for(const tile of list(ts.tile))if(list(tile.properties?.property).some(p=>p._attributes.name==='collision'&&p._attributes.value==='true'))blocked.add(Number(t._attributes.firstgid)+Number(tile._attributes.id))
  }
  const mw=Number(map._attributes.width)
  for(const l of list(map.layer))l.data._text.trim().split(/\s*,\s*/).map(Number).forEach((gid,i)=>{if(blocked.has(gid))rects.push({x:(i%mw)*T,y:Math.floor(i/mw)*T,w:T,h:T})})
  for(const o of world.objects.filter(o=>o.kind==='prop'&&art.assets[o.asset].solid)){const [w,h]=art.assets[o.asset].hitbox;rects.push({...o,w,h})}
  const step=8,W=world.width/step,H=world.height/step,cells=new Uint8Array(W*H),[pw,ph]=art.actorHitbox
  for(const r of rects)for(let y=Math.max(0,Math.floor((r.y-ph)/step)+1);y<Math.min(H,Math.ceil((r.y+r.h)/step));y++)for(let x=Math.max(0,Math.floor((r.x-pw)/step)+1);x<Math.min(W,Math.ceil((r.x+r.w)/step));x++)cells[y*W+x]=1
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(x*step+pw>world.width||y*step+ph>world.height)cells[y*W+x]=1
  const start=Math.round(world.start.y/step)*W+Math.round(world.start.x/step)
  assert.equal(cells[start],0,world.id+' blocked start')
  const queue=[start];cells[start]=2
  for(let n=0;n<queue.length;n++){const i=queue[n],x=i%W,y=Math.floor(i/W);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,ni=ny*W+nx;if(nx<0||ny<0||nx>=W||ny>=H||cells[ni])continue;cells[ni]=2;queue.push(ni)}}
  for(const o of world.objects.filter(o=>o.kind!=='prop')){
   const reached=queue.some(i=>Math.hypot((i%W)*step-o.x,Math.floor(i/W)*step-o.y)<56)
   assert.ok(reached,`${world.id}: ${o.name} unreachable at ${o.x},${o.y}`)
  }
 }
})
