import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'
import { ensureBiomeProps } from './biome-props.mjs'

const root=process.cwd(),base='public/tiny-swords/'
const read=file=>PNG.sync.read(fs.readFileSync(file))
const write=(file,png)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,PNG.sync.write(png))}
const copy=(s,d,sx,sy,w,h,dx=0,dy=0)=>PNG.bitblt(s,d,sx,sy,w,h,dx,dy)
const bounds=(p,x=0,y=0,w=p.width,h=p.height)=>{
 let b=[w,h,-1,-1]
 for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(p.data[((y+yy)*p.width+x+xx)*4+3]>=128)b=[Math.min(b[0],xx),Math.min(b[1],yy),Math.max(b[2],xx),Math.max(b[3],yy)]
 return b
}
function bodyBounds(p,x,w){
 const seen=new Uint8Array(w*p.height),queue=new Int32Array(seen.length);let largest=[]
 for(let y=0;y<p.height;y++)for(let xx=0;xx<w;xx++){
  const id=y*w+xx;if(seen[id]||p.data[(y*p.width+x+xx)*4+3]<128)continue
  let head=0,tail=1;queue[0]=id;seen[id]=1;let b=[xx,y,xx,y]
  while(head<tail){const v=queue[head++],cx=v%w,cy=Math.floor(v/w);b=[Math.min(b[0],cx),Math.min(b[1],cy),Math.max(b[2],cx),Math.max(b[3],cy)]
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy,ni=ny*w+nx;if(nx<0||ny<0||nx>=w||ny>=p.height||seen[ni]||p.data[(ny*p.width+x+nx)*4+3]<128)continue;seen[ni]=1;queue[tail++]=ni}
  }
  if(tail>(largest.count??0))largest=Object.assign(b,{count:tail})
 }
 return largest
}
const colors=new Map()
for(const file of ['Units/Blue Units/Monk/Idle.png','Units/Blue Units/Warrior/Warrior_Idle.png','Terrain/Resources/Wood/Trees/Tree1.png','Buildings/Blue Buildings/House1.png']){
 const p=read(base+file);for(let i=0;i<p.data.length;i+=4)if(p.data[i+3]>=128){const c=[...p.data.slice(i,i+3)];colors.set(c.join(','),c)}
}
const palette=[...colors.values()],memo=new Map()
function quantize(r,g,b){const key=(r<<16)|(g<<8)|b;if(memo.has(key))return memo.get(key);let best=palette[0],score=Infinity
 for(const c of palette){const d=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;if(d<score){best=c;score=d}}memo.set(key,best);return best
}
function normalize(name,count,height=70){
 const p=read(`art/generated-source/${name}.png`),cell=Math.floor(p.width/count),bodies=Array.from({length:count},(_,i)=>bodyBounds(p,i*cell,cell))
 if(bodies.some(b=>b.length!==4))throw Error(`${name}: empty generated frame`)
 // Every sequence begins at rest. Its first body's height fixes the scale;
 // connected spell arcs must never shrink the character or shift its center.
 const rest=bodies[0],restHeight=rest[3]-rest[1]+1,scale=height/restHeight,out=new PNG({width:count*192,height:192}),feet=[]
 for(let i=0;i<count;i++){
  const b=bodies[i];let hairX=0,hairCount=0
  for(let y=b[1];y<b[1]+restHeight*.48;y++)for(let x=0;x<cell;x++){
   const si=(y*p.width+i*cell+x)*4,[r,g,blue,a]=p.data.slice(si,si+4)
   if(a>=128&&r>g*1.12&&r>blue*1.2&&r<180){hairX+=x;hairCount++}
  }
  const hairCenter=hairCount?hairX/hairCount:(b[0]+b[2])/2
  let foot=-1,footX=0,footCount=0
  for(let y=Math.max(0,Math.floor(b[1]+restHeight*.55));y<Math.min(p.height,b[1]+restHeight*1.15);y++)for(let x=Math.floor(hairCenter-restHeight*.12);x<=hairCenter+restHeight*.12;x++){
   if(x<0||x>=cell)continue
   const si=(y*p.width+i*cell+x)*4,[r,g,blue,a]=p.data.slice(si,si+4)
   if(a<128)continue
   if(y>foot){foot=y;footX=x;footCount=1}else if(y===foot){footX+=x;footCount++}
  }
  if(foot<0)throw Error(`${name}/${i}: body foot not found`)
  const center=footX/footCount
  // The generated attack arc can extend beyond its nominal source cell.
  // Follow the connected body/arc across the source sheet, rejecting a
  // neighboring pose's stray crescent instead of cutting either arc in half.
  let mask
  if(name==='nobby-attack'){
   mask=new Uint8Array(p.width*p.height);const queue=[foot*p.width+i*cell+Math.round(center)];mask[queue[0]]=1
   for(let n=0;n<queue.length;n++){
    const v=queue[n],cx=v%p.width,cy=Math.floor(v/p.width)
    for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
     const nx=cx+dx,ny=cy+dy,ni=ny*p.width+nx
     if(nx<0||ny<0||nx>=p.width||ny>=p.height||mask[ni]||p.data[ni*4+3]<128)continue
     mask[ni]=1;queue.push(ni)
    }
   }
  }
  // One scale for the entire animation. Only translation is frame-specific.
  for(let y=0;y<192;y++)for(let x=0;x<192;x++){
   const sx=Math.floor((x-96)/scale+center),sy=Math.floor((y-132)/scale+foot)
   if(sy<0||sy>=p.height||i*cell+sx<0||i*cell+sx>=p.width||(!mask&&(sx<0||sx>=cell)))continue
   const si=(sy*p.width+i*cell+sx)*4,di=(y*out.width+i*192+x)*4
   if(mask&&!mask[sy*p.width+i*cell+sx])continue
   if(p.data[si+3]<128)continue
   const c=quantize(p.data[si],p.data[si+1],p.data[si+2]);out.data.set([...c,255],di)
  }
  feet.push([96,132])
 }
 write(base+`custom/${name}.png`,out)
 return {source:`art/generated-source/${name}.png`,scale,footPixels:feet}
}
const generation={}
for(const [name,count]of [['nobby-idle',6],['nobby-run',4],['nobby-cast',11],['nobby-attack',11],['mira-idle',6]])generation[name]=normalize(name,count)

// The pack's UI images are separated nine-slice atlases, not stretchable panels.
const paper=read(base+'UI Elements/UI Elements/Papers/RegularPaper.png'),panel=new PNG({width:192,height:192})
for(let y=0;y<3;y++)for(let x=0;x<3;x++)copy(paper,panel,x*128,y*128,64,64,x*64,y*64)
write(base+'compiled/paper-panel.png',panel)
const wood=read(base+'UI Elements/UI Elements/Wood Table/WoodTable.png'),table=new PNG({width:320,height:320}),s=[0,192,320],d=[0,128,192],size=[128,64,128]
for(let y=0;y<3;y++)for(let x=0;x<3;x++)copy(wood,table,s[x],s[y],size[x],size[y],d[x],d[y])
write(base+'compiled/wood-panel.png',table)

const grass=read(base+'Terrain/Tileset/Tilemap_color1.png'),earth=read('art/generated-source/earth.png'),paths=new PNG({width:192,height:192}),texture=new PNG({width:64,height:64})
const side=Math.min(earth.width,earth.height)
for(let y=0;y<64;y++)for(let x=0;x<64;x++){
 const sx=Math.floor(x*side/64),sy=Math.floor(y*side/64),si=(sy*earth.width+sx)*4,di=(y*64+x)*4
 // Keep earth colors separate from grass while sharing the pack's outline colors.
 texture.data.set([earth.data[si],earth.data[si+1],earth.data[si+2],255],di)
}
// Equal opposite-edge texels eliminate filtering-independent tile seams.
for(let y=0;y<64;y++)for(let c=0;c<3;c++){const a=(y*64)*4+c,b=(y*64+63)*4+c,v=Math.round((texture.data[a]+texture.data[b])/2);texture.data[a]=texture.data[b]=v}
for(let x=0;x<64;x++)for(let c=0;c<3;c++){const a=x*4+c,b=(63*64+x)*4+c,v=Math.round((texture.data[a]+texture.data[b])/2);texture.data[a]=texture.data[b]=v}
for(let ty=0;ty<3;ty++)for(let tx=0;tx<3;tx++)for(let y=0;y<64;y++)for(let x=0;x<64;x++){
 const si=((ty*64+y)*grass.width+tx*64+x)*4,di=((ty*64+y)*192+tx*64+x)*4
 if(grass.data[si+3]<128)continue
 let edge=false
 for(let oy=-4;oy<=4&&!edge;oy++)for(let ox=-4;ox<=4;ox++){
  const gx=tx*64+x+ox,gy=ty*64+y+oy
  if(gx<0||gy<0||gx>=192||gy>=192||grass.data[(gy*grass.width+gx)*4+3]<128){edge=true;break}
 }
 paths.data.set(edge?[grass.data[si],grass.data[si+1],grass.data[si+2],255]:[...texture.data.slice((y*64+x)*4,(y*64+x)*4+3),255],di)
}
write(base+'compiled/path.png',paths)
const bridgeSource=read('art/generated-source/bridge.png'),bridgeBounds=bounds(bridgeSource),bridgeOut=new PNG({width:256,height:128})
for(let y=0;y<128;y++)for(let x=0;x<256;x++){
 const sx=bridgeBounds[0]+Math.floor(x*(bridgeBounds[2]-bridgeBounds[0]+1)/256),sy=bridgeBounds[1]+Math.floor(y*(bridgeBounds[3]-bridgeBounds[1]+1)/128),si=(sy*bridgeSource.width+sx)*4,di=(y*256+x)*4
 if(bridgeSource.data[si+3]>=128)bridgeOut.data.set([...quantize(...bridgeSource.data.slice(si,si+3)),255],di)
}
write(base+'compiled/bridge.png',bridgeOut)
fs.mkdirSync('src/tiled/tiny-swords',{recursive:true})
fs.copyFileSync(base+'Terrain/Tileset/Water Foam.png','src/tiled/tiny-swords/foam.png')
for(const [name,file]of [['grass','Terrain/Tileset/Tilemap_color1.png'],['forest','Terrain/Tileset/Tilemap_color3.png'],['meadow','Terrain/Tileset/Tilemap_color4.png'],['water','Terrain/Tileset/Water Background color.png'],['path','compiled/path.png'],['bridge','compiled/bridge.png']])fs.copyFileSync(base+file,`src/tiled/tiny-swords/${name}.png`)

ensureBiomeProps()
const assets={}
function actor(id,states,foot=[96,132],hitbox=[32,24]){assets[id]={kind:'actor',frame:[192,192],foot,hitbox,directional:true,animations:states}}
const anim=(image,frames,fps)=>({image:'tiny-swords/'+image,frames,fps})
// Calm ambient poses; movement, attacks and spells stay responsive.
actor('hero',{stand:anim('custom/nobby-idle.png',6,1.5),walk:anim('custom/nobby-run.png',4,10),attack:anim('custom/nobby-attack.png',11,28),heal:anim('custom/nobby-cast.png',11,16)})
actor('female',{stand:anim('custom/mira-idle.png',6,1.5),walk:anim('custom/mira-idle.png',6,4)})
for(const [id,color]of [['enemy-warrior','Red'],['enemy-berserker','Black']])actor(id,{stand:anim(`Units/${color} Units/Warrior/Warrior_Idle.png`,8,4),walk:anim(`Units/${color} Units/Warrior/Warrior_Run.png`,6,12),attack:anim(`Units/${color} Units/Warrior/Warrior_Attack1.png`,4,14)})
function prop(id,file,frame,frames,foot,hitbox,solid=true,fps=6){assets[id]={kind:'prop',frame,foot,hitbox,solid,directional:false,animations:{stand:anim(file,frames,fps),walk:anim(file,frames,fps)}}}
prop('tree-oak','Terrain/Resources/Wood/Trees/Tree1.png',[192,256],8,[96,234],[40,24],true,2.5)
prop('tree-birch','Terrain/Resources/Wood/Trees/Tree2.png',[192,256],8,[96,234],[40,24],true,2.5)
prop('tree-small','Terrain/Resources/Wood/Trees/Tree3.png',[192,192],8,[96,164],[32,20],true,2.5)
prop('bush','Terrain/Decorations/Bushes/Bushe1.png',[128,128],8,[64,99],[40,20],false,2.5)
prop('rock','Terrain/Decorations/Rocks/Rock1.png',[64,64],1,[32,55],[36,22])
prop('ore','Terrain/Resources/Gold/Gold Stones/Gold Stone 1.png',[128,128],1,[64,102],[54,30])
prop('sheep','Terrain/Resources/Meat/Sheep/Sheep_Idle.png',[128,128],6,[64,96],[32,20],false,4)
for(const [id,file,frame,foot,hitbox]of [
 ['house','House1.png',[128,192],[64,170],[88,44]],['house-large','House2.png',[128,192],[64,170],[92,46]],
 ['barracks','Barracks.png',[192,256],[96,226],[140,64]],['monastery','Monastery.png',[192,320],[96,288],[130,62]],
 ['tower','Tower.png',[128,256],[64,230],[76,42]],['castle','Castle.png',[320,256],[160,224],[240,66]]
])prop(id,'Buildings/Blue Buildings/'+file,frame,1,foot,hitbox)
prop('portal-stone','Terrain/Decorations/Rocks/Rock2.png',[64,64],1,[32,55],[28,24],false)
prop('portal-marker','Units/Blue Units/Monk/Heal_Effect.png',[192,192],11,[96,132],[28,24],false,8)
prop('foam','Terrain/Tileset/Water Foam.png',[192,192],16,[96,96],[1,1],false,5)
prop('water-rock','Terrain/Decorations/Rocks in the Water/Water Rocks_01.png',[64,64],16,[32,52],[1,1],false,5)
prop('desert-cactus','biomes/desert-cactus.png',[64,128],1,[32,113],[22,18],true,1)
prop('desert-cactus-small','biomes/desert-cactus-small.png',[64,128],1,[32,113],[20,16],true,1)
prop('desert-rock','biomes/desert-rock.png',[64,64],1,[32,55],[38,22],true,1)
prop('desert-house','biomes/desert-house.png',[128,192],1,[64,171],[82,42],true,1)
prop('desert-tent','biomes/desert-tent.png',[128,192],1,[64,171],[80,35],true,1)
prop('desert-temple','biomes/desert-temple.png',[128,192],1,[64,171],[90,44],true,1)
prop('snow-pine','biomes/snow-pine.png',[128,192],1,[64,172],[34,24],true,1)
for(const asset of Object.values(assets))for(const state of Object.values(asset.animations)){
 const p=read('public/'+state.image),[fw,fh]=asset.frame
 if(p.width!==fw*state.frames||p.height!==fh)throw Error(`${state.image}: expected ${fw*state.frames}×${fh}, got ${p.width}×${p.height}`)
 state.visibleBounds=Array.from({length:state.frames},(_,i)=>bounds(p,i*fw,0,fw,fh))
}
fs.mkdirSync('src/art',{recursive:true})
fs.writeFileSync('src/art/registry.json',JSON.stringify({version:1,tileSize:64,pixelScale:1,actorHitbox:[32,24],palette:{outline:'#293544',grass:'#8ba86e',water:'#448f97',earth:'#d2ad65',cream:'#eee2c3',blue:'#487fa8'},assets,generation},null,2)+'\n')
console.log(`Art registry: ${Object.keys(assets).length} assets, fixed native frames, binary alpha, compiled pack UI and terrain.`)
