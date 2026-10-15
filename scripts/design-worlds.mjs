// Reproducible authored layouts. This is an explicit art migration command, not a
// prebuild hook: normal builds NEVER overwrite maps edited by the player in Tiled.
import fs from 'node:fs'
import path from 'node:path'
// One-time destructive migration. It must never run as a build step or by accident.
if (!process.argv.includes('--force')) {
 console.error('Abgebrochen: Dieser Befehl überschreibt simplemap.tmx und wald.tmx. Nur mit --force ausführen; vorher Karten sichern.')
 process.exit(2)
}
const existingMaps=['simplemap.tmx','wald.tmx'].filter(name=>fs.existsSync(path.join('src/tiled',name)))
if (existingMaps.length) {
 const backup=path.join('art','map-backups',new Date().toISOString().replace(/[:.]/g,'-'))
 fs.mkdirSync(backup,{recursive:true})
 for (const name of existingMaps) fs.copyFileSync(path.join('src/tiled',name),path.join(backup,name))
 console.log(`Originalkarten gesichert: ${backup}`)
}
const art=JSON.parse(fs.readFileSync('src/art/registry.json','utf8'))
const previous=JSON.parse(fs.readFileSync('art/world-content.json','utf8'))
const TILE=art.tileSize
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')
const directory='src/tiled'
const tileset=(name,image,columns,rows,collision=[])=>`<?xml version="1.0" encoding="UTF-8"?>\n<tileset version="1.10" tiledversion="1.12.2" name="${name}" tilewidth="64" tileheight="64" tilecount="${columns*rows}" columns="${columns}"><image source="tiny-swords/${image}.png" width="${columns*64}" height="${rows*64}"/>${collision.map(id=>`<tile id="${id}"><properties><property name="collision" type="bool" value="true"/></properties></tile>`).join('')}</tileset>\n`
fs.writeFileSync(directory+'/grass.tsx',tileset('Tiny Swords · Wiese','grass',9,6))
fs.writeFileSync(directory+'/forest.tsx',tileset('Tiny Swords · Wald','forest',9,6))
fs.writeFileSync(directory+'/path.tsx',tileset('Tiny Swords · Wege','path',3,3))
fs.writeFileSync(directory+'/water.tsx',tileset('Tiny Swords · Wasser','water',1,1,[0]))
fs.writeFileSync(directory+'/water-background.tsx',tileset('Tiny Swords · Wassergrund','water',1,1))
fs.writeFileSync(directory+'/bridge.tsx',tileset('Tiny Swords · Brücke','bridge',4,2))
const foamAnimation=Array.from({length:9},(_,i)=>{
 const id=Math.floor(i/3)*48+i%3
 return `<tile id="${id}"><animation>${Array.from({length:16},(_,f)=>`<frame tileid="${id+f*3}" duration="125"/>`).join('')}</animation></tile>`
}).join('')
fs.writeFileSync(directory+'/foam.tsx',tileset('Tiny Swords · Uferwellen','foam',48,3).replace('</tileset>',foamAnimation+'</tileset>'))
const masks=[]

for(const old of previous){
 const forest=old.id==='wald',W=forest?48:40,H=forest?38:32,total=W*H
 const water=1,grass=2,paths=56,bridge=65,background=73,foam=74
 const land=new Uint8Array(total),passable=new Uint8Array(total),road=new Uint8Array(total),ground=Array(total).fill(0),waterTiles=Array(total).fill(0),roads=Array(total).fill(0),bridges=Array(total).fill(0),foamTiles=Array(total).fill(0)
 const index=(x,y)=>y*W+x,inBounds=(x,y)=>x>=0&&y>=0&&x<W&&y<H
 const isLand=(x,y)=>inBounds(x,y)&&land[index(x,y)]===1
 let seed=forest?83:17
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  let yes=x>=2+Math.round(Math.sin(y*.4))&&x<W-3+Math.round(Math.sin(y*.5))&&y>=2+Math.round(Math.sin(x*.32))&&y<H-3+Math.round(Math.sin(x*.28))
  if(!forest){const rx=24+Math.round(Math.sin(y*.35));if(x>=rx&&x<=rx+1)yes=false;if(((x-32)/4)**2+((y-25)/3)**2<1)yes=false}
  else if(((x-31)/6)**2+((y-24)/5)**2<1)yes=false
  land[index(x,y)]=yes?1:0;passable[index(x,y)]=yes?1:0
 }
 function lane(x0,y0,x1,y1,width=2){
  const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))
  for(let i=0;i<=n;i++){const x=Math.round(x0+(x1-x0)*i/Math.max(1,n)),y=Math.round(y0+(y1-y0)*i/Math.max(1,n));for(let oy=0;oy<width;oy++)for(let ox=0;ox<width;ox++)if(inBounds(x+ox,y+oy)&&isLand(x+ox,y+oy))road[index(x+ox,y+oy)]=1}
 }
 if(!forest){lane(4,16,35,16);lane(12,6,12,27);lane(12,8,31,8);lane(12,22,21,22)}
 else{lane(5,25,22,25);lane(12,9,12,32);lane(12,17,35,17);lane(31,9,31,17);lane(12,31,22,31)}
 if(!forest){
  // Four-by-two native bridge tiles. The passability mask is separate from water
  // artwork, so a bridge never turns the stream into a strip of painted grass.
  for(let y=16;y<18;y++)for(let x=22;x<26;x++){passable[index(x,y)]=1;bridges[index(x,y)]=bridge+(y-16)*4+x-22;road[index(x,y)]=1}
 }
 function autotile(mask,x,y,columns=3){
  const has=(xx,yy)=>inBounds(xx,yy)&&mask[index(xx,yy)]
  const cx=!has(x-1,y)?0:!has(x+1,y)?2:1,cy=!has(x,y-1)?0:!has(x,y+1)?2:1
  return cy*columns+cx
 }
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=index(x,y)
  if(land[i])ground[i]=grass+autotile(land,x,y,9)
  else if(!passable[i])waterTiles[i]=water
  if(road[i]&&land[i])roads[i]=paths+autotile(road,x,y)
  if(!land[i]){
   const neighbors=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]
   const shore=neighbors.find(([dx,dy])=>isLand(x+dx,y+dy))
   if(shore)foamTiles[i]=foam+(1-shore[0])+(1-shore[1])*48
  }
 }
 // A raised northern ridge: native grass ledge and two rock strata. The ochre
 // path cuts through the south face, keeping its summit accessible.
 const hill=forest?{x:28,y:5,w:9,h:6}:{x:29,y:3,w:7,h:5}
 for(let y=hill.y;y<hill.y+hill.h;y++)for(let x=hill.x;x<hill.x+hill.w;x++){
  if(!isLand(x,y))continue
  const cx=x===hill.x?0:x===hill.x+hill.w-1?2:1,cy=y===hill.y?0:y===hill.y+hill.h-1?2:1
  ground[index(x,y)]=grass+5+cy*9+cx
 }
 for(let y=0;y<2;y++)for(let x=hill.x;x<hill.x+hill.w;x++){
  const yy=hill.y+hill.h+y;if(!isLand(x,yy))continue
  const gap=x>=hill.x+2&&x<=hill.x+3
  if(gap){road[index(x,yy)]=1;roads[index(x,yy)]=paths+4}
  else{ground[index(x,yy)]=grass+5+(3+y)*9+(x===hill.x?0:x===hill.x+hill.w-1?2:1);passable[index(x,yy)]=0;waterTiles[index(x,yy)]=water;roads[index(x,yy)]=0;road[index(x,yy)]=0}
 }
 const start=forest?{x:12*TILE+16,y:25*TILE}:{x:12*TILE+16,y:17*TILE}
 const positions=forest?[[12,27],[22,17],[31,8],[7,25]]:[[12,19],[20,12],[30,20],[32,16]]
 const objects=old.objects.map((o,i)=>({...o,x:positions[i][0]*TILE+16,y:positions[i][1]*TILE}))
 let next=100
 const props=[]
 function add(asset,x,y,name=asset){
  const meta=art.assets[asset]
  if(!meta)throw Error('Missing prop '+asset)
  const box=meta.hitbox
  const o={id:`object-${next++}`,kind:'prop',asset,name,x:Math.round(x),y:Math.round(y)}
  props.push(o)
  if(meta.solid)for(let yy=Math.floor(o.y/TILE);yy<=Math.floor((o.y+box[1]-1)/TILE);yy++)for(let xx=Math.floor(o.x/TILE);xx<=Math.floor((o.x+box[0]-1)/TILE);xx++)if(inBounds(xx,yy))passable[index(xx,yy)]=0
 }
 if(!forest){
  for(const [a,x,y,n]of [['house',8,15,'Nobbys Haus'],['house-large',15,15,'Miras Haus'],['house',8,21,'Gästehaus'],['house-large',17,21,'Handelshaus'],['monastery',6,10,'Heilerhalle'],['barracks',18,10,'Wachhaus'],['castle',16,5,'Blaue Burg'],['tower',31,5,'Uferturm']])add(a,x*TILE,y*TILE,n)
  for(const [x,y]of [[5,21],[5,23],[7,24],[9,26]])add('sheep',x*TILE,y*TILE,'Schaf')
 }else{
  add('house',8*TILE,23*TILE,'Waldhütte');add('tower',33*TILE,6*TILE,'Alter Wachturm');add('ore',35*TILE,9*TILE,'Goldader');add('ore',29*TILE,6*TILE,'Goldader')
 }
 const reserved=[start,...objects,...props]
 const nearRoad=(x,y)=>{for(let yy=Math.floor(y/TILE)-1;yy<=Math.floor(y/TILE)+1;yy++)for(let xx=Math.floor(x/TILE)-1;xx<=Math.floor(x/TILE)+1;xx++)if(inBounds(xx,yy)&&road[index(xx,yy)])return true;return false}
 const trees=[]
 for(let attempt=0;attempt<1600&&trees.length<(forest?82:40);attempt++){
  const x=Math.round((3+random()*(W-6))*TILE),y=Math.round((3+random()*(H-6))*TILE)
  if(!isLand(Math.floor(x/TILE),Math.floor(y/TILE))||!passable[index(Math.floor(x/TILE),Math.floor(y/TILE))]||nearRoad(x,y))continue
  if(!forest&&x>5*TILE&&x<21*TILE&&y<24*TILE)continue
  if(reserved.some(o=>Math.hypot(x-o.x,y-o.y)<180)||trees.some(o=>Math.hypot(x-o.x,y-o.y)<165))continue
  const asset=forest?(random()<.55?'tree-oak':'tree-birch'):(random()<.7?'tree-oak':'tree-small')
  add(asset,x,y,'Baum');trees.push({x,y})
 }
 for(let attempt=0,placed=0;attempt<500&&placed<38;attempt++){
  const x=Math.round((3+random()*(W-6))*TILE),y=Math.round((3+random()*(H-6))*TILE)
  if(!isLand(Math.floor(x/TILE),Math.floor(y/TILE))||!passable[index(Math.floor(x/TILE),Math.floor(y/TILE))]||nearRoad(x,y)||reserved.some(o=>Math.hypot(x-o.x,y-o.y)<125)||trees.some(o=>Math.hypot(x-o.x,y-o.y)<90)||props.some(o=>Math.hypot(x-o.x,y-o.y)<75))continue
  add(random()<.7?'bush':'rock',x,y,'Natur');placed++
 }
 for(const [x,y]of forest?[[28,23],[34,24],[30,27]]:[[24,12],[25,21],[32,25]])if(!isLand(x,y))add('water-rock',x*TILE,y*TILE,'Wasserstein')
 objects.push(...props)
 const propXML=(key,value)=>`<property name="${esc(key)}" type="${typeof value==='number'?'int':'string'}" value="${esc(value)}"/>`
 const objXML=o=>{
  const metadata=o.kind==='prop'?art.assets[o.asset]:art.assets[o.kind==='monster'?'enemy-warrior':o.kind==='npc'?'female':'portal-marker']
  const values=o.kind==='prop'?{asset:o.asset}:o.kind==='monster'?{enemy:o.enemy,level:o.level,hp:o.hp,vision:o.vision}:o.kind==='npc'?{text:o.text}:{target:o.target}
  return `<object id="${o.id.split('-').at(-1)}" name="${esc(o.name)}" class="${o.kind}" x="${o.x}" y="${o.y}" width="${metadata.hitbox[0]}" height="${metadata.hitbox[1]}"><properties>${Object.entries(values).map(([k,v])=>propXML(k,v)).join('')}</properties></object>`
 }
 const layer=(id,name,data,visible=true)=>`<layer id="${id}" name="${name}" width="${W}" height="${H}"${visible?'':' visible="0"'}><data encoding="csv">\n${Array.from({length:H},(_,y)=>data.slice(y*W,(y+1)*W).join(',')).join(',\n')}\n</data></layer>`
 const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<map version="1.10" tiledversion="1.12.2" orientation="orthogonal" renderorder="right-down" width="${W}" height="${H}" tilewidth="64" tileheight="64" infinite="0" nextlayerid="8" nextobjectid="${next}"><properties><property name="nobbyWorld" type="bool" value="true"/><property name="title" value="${esc(old.title)}"/></properties><tileset firstgid="1" source="water.tsx"/><tileset firstgid="2" source="${forest?'forest':'grass'}.tsx"/><tileset firstgid="56" source="path.tsx"/><tileset firstgid="65" source="bridge.tsx"/><tileset firstgid="73" source="water-background.tsx"/><tileset firstgid="74" source="foam.tsx"/>${layer(1,'Wassergrund',Array(total).fill(background))}${layer(7,'Uferwellen',foamTiles)}${layer(2,'Gelände',ground)}${layer(3,'Wasser und Klippen · Kollision',waterTiles,false)}${layer(4,'Wege',roads)}${layer(5,'Brücke',bridges)}<objectgroup id="6" name="Spiellogik"><object id="1" name="Start" class="start" x="${start.x}" y="${start.y}"><point/></object>${objects.map(objXML).join('')}</objectgroup></map>\n`
 fs.writeFileSync(path.join(directory,old.id+'.tmx'),xml)
 masks.push({id:old.id,width:W,height:H,tileSize:TILE,start,passable:[...passable],road:[...road],hill,bridge:!forest?{x:22,y:16,width:4,height:2}:null})
 console.log(`${old.id}: ${W}×${H} cells, ${objects.length} gameplay/nature objects`)
}
fs.writeFileSync('art/authored-layouts.json',JSON.stringify(masks)+'\n')
