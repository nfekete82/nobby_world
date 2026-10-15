import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const read=p=>PNG.sync.read(fs.readFileSync(path.join(root,p)))
const write=(file,p)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),PNG.sync.write(p))}
const bounds=(p,x0=0,y0=0,w=p.width,h=p.height)=>{
 let x1=w,y1=h,x2=-1,y2=-1
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(p.data[((y+y0)*p.width+x+x0)*4+3]>=128){
  x1=Math.min(x,x1);y1=Math.min(y,y1);x2=Math.max(x,x2);y2=Math.max(y,y2)
 }
 if(x2<0)throw Error('Empty sprite frame')
 return [x1,y1,x2,y2]
}
// Discard disconnected slivers from a neighboring pose at atlas cell edges.
// Deliberately retain central detached magic particles and bone fragments.
function cleanCells(p,columns,rows){
 const cw=Math.floor(p.width/columns),ch=Math.floor(p.height/rows)
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  const visited=new Uint8Array(cw*ch),parts=[]
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
   const at=y*cw+x,alpha=p.data[((row*ch+y)*p.width+col*cw+x)*4+3]
   if(visited[at]||alpha<128)continue
   const queue=[at];visited[at]=1;let sumX=0,sumY=0
   for(let i=0;i<queue.length;i++){
    const v=queue[i],vx=v%cw,vy=Math.floor(v/cw);sumX+=vx;sumY+=vy
    for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
     const nx=vx+dx,ny=vy+dy,ni=ny*cw+nx
     if(nx<0||ny<0||nx>=cw||ny>=ch||visited[ni]||p.data[((row*ch+ny)*p.width+col*cw+nx)*4+3]<128)continue
     visited[ni]=1;queue.push(ni)
    }
   }
   parts.push({queue,cx:sumX/queue.length,cy:sumY/queue.length})
  }
  const largest=Math.max(...parts.map(v=>v.queue.length))
  for(const part of parts)if(part.queue.length<largest*.2&&(part.cx<cw*.15||part.cx>cw*.88||part.cy<ch*.12||part.cy>ch*.92))
   for(const at of part.queue){const x=at%cw,y=Math.floor(at/cw);p.data[((row*ch+y)*p.width+col*cw+x)*4+3]=0}
 }
 return p
}
/** Generative atlases have semantic rows but imperfectly equal row heights.
 * Find their transparent gutters before slicing, so a tree root or the next
 * pose's feet can never become floating debris in another animation. */
function rowSlices(p,count,columns){
 const density=Array(p.height).fill(0)
 for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++)if(p.data[(y*p.width+x)*4+3]>=128)density[y]++
 const cuts=[0]
 for(let row=1;row<count;row++){
  const ideal=p.height*row/count
  const low=Math.max(cuts.at(-1)+16,Math.floor(p.height*(row-.35)/count))
  const high=Math.min(p.height-16,Math.ceil(p.height*(row+.45)/count))
  let best=Math.round(ideal),score=Infinity
  for(let y=low;y<=high;y++){
   let occupied=0
   for(let d=-2;d<=2;d++)occupied+=density[Math.max(0,Math.min(p.height-1,y+d))]
   const value=occupied+Math.abs(y-ideal)*.001
   if(value<score){score=value;best=y}
  }
  cuts.push(best)
 }
 cuts.push(p.height)
 return Array.from({length:count},(_,row)=>{
  const strip=new PNG({width:p.width,height:cuts[row+1]-cuts[row]})
  PNG.bitblt(p,strip,0,cuts[row],p.width,strip.height,0,0)
  return cleanCells(strip,columns,1)
 })
}
const PROP_ATLASES={
 'jungle-props':[
  ['jungle-palm',[192,256],[96,234],[40,24],true,0],
  ['jungle-tree',[192,256],[96,234],[40,24],true,1],
  ['jungle-fern',[128,128],[64,100],[30,18],false,2]
 ],
 'snow-props':[
  ['snow-fir',[192,256],[96,234],[40,24],true,0],
  ['snow-crystals',[128,128],[64,104],[42,24],true,1],
  ['snow-shrub',[128,128],[64,100],[28,16],false,2]
  ,['snow-pine',[128,192],[64,172],[34,24],true,0]
 ],
 'cactus-props':[
  ['desert-cactus',[64,128],[32,113],[22,18],true,0],
  ['desert-cactus-small',[64,128],[32,113],[20,16],true,1],
  ['desert-prickly-pear',[64,64],[32,56],[30,18],true,2]
 ]
}
function compileProps(registry){
 for(const [source,specs]of Object.entries(PROP_ATLASES)){
  const file=`art/generated-source/expansion/${source}.png`
  if(!fs.existsSync(path.join(root,file)))continue
  const rows=rowSlices(read(file),3,4)
  for(const [id,frame,foot,hitbox,solid,row]of specs){
   const p=rows[row],cw=Math.floor(p.width/4),ch=p.height
   const boxes=Array.from({length:4},(_,i)=>bounds(p,i*cw,0,cw,ch))
   // Match original Tree1's 183px visible height instead of filling its cell.
   const height=['jungle-palm','jungle-tree','snow-fir'].includes(id)?183:foot[1]-10
   const scale=Math.min((frame[0]-12)/Math.max(...boxes.map(b=>b[2]-b[0]+1)),
    height/Math.max(...boxes.map(b=>b[3]-b[1]+1)))
   const out=new PNG({width:frame[0]*4,height:frame[1]}),visibleBounds=[]
   for(let i=0;i<4;i++){
    const b=boxes[i],cx=(b[0]+b[2])/2
    for(let y=0;y<frame[1];y++)for(let x=0;x<frame[0];x++){
     const sx=Math.floor((x-foot[0])/scale+cx),sy=Math.floor((y-foot[1])/scale+b[3])
     if(sx<0||sy<0||sx>=cw||sy>=ch)continue
     const at=(sy*p.width+i*cw+sx)*4,to=(y*out.width+i*frame[0]+x)*4
     if(p.data[at+3]<128)continue
     for(let k=0;k<3;k++)out.data[to+k]=Math.min(255,Math.round(p.data[at+k]/8)*8)
     out.data[to+3]=255
    }
    visibleBounds.push(bounds(out,i*frame[0],0,...frame))
   }
   const image=`tiny-swords/expansion/${id}-stand.png`
   write('public/'+image,out)
   const state={image,frames:4,fps:2.5,visibleBounds}
   registry.assets[id]={kind:'prop',frame,foot,hitbox,solid,directional:false,animations:{stand:state,walk:state}}
  }
 }
 const file='art/generated-source/expansion/agave.png'
 if(fs.existsSync(path.join(root,file))){
  const p=read(file),b=bounds(p),scale=48/Math.max(b[2]-b[0]+1,b[3]-b[1]+1)
  const out=new PNG({width:64,height:64})
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
   const sx=Math.floor((x-32)/scale+(b[0]+b[2])/2),sy=Math.floor((y-56)/scale+b[3])
   if(sx<0||sy<0||sx>=p.width||sy>=p.height)continue
   const at=(sy*p.width+sx)*4,to=(y*64+x)*4
   if(p.data[at+3]>=128)out.data.set([...p.data.subarray(at,at+3),255],to)
  }
  write('public/tiny-swords/illustrated/desert-agave.png',out)
  write('public/tiny-swords/biomes/desert-agave.png',out)
  for(const state of Object.values(registry.assets['desert-agave'].animations))state.visibleBounds=[bounds(out)]
 }
}
function compileBuildings(registry){
 const file='art/generated-source/expansion/desert-buildings.png'
 if(!fs.existsSync(path.join(root,file)))return
 const p=read(file),density=Array(p.width).fill(0),cuts=[0]
 for(let x=0;x<p.width;x++)for(let y=0;y<p.height;y++)if(p.data[(y*p.width+x)*4+3]>=128)density[x]++
 for(let col=1;col<3;col++){
  const ideal=p.width*col/3;let best=Math.round(ideal),score=Infinity
  for(let x=Math.floor(p.width*(col-.35)/3);x<Math.ceil(p.width*(col+.35)/3);x++){
   const occupied=density[x-1]+density[x]+density[x+1]
   const value=occupied+Math.abs(x-ideal)*.001
   if(value<score){score=value;best=x}
  }
  cuts.push(best)
 }
 cuts.push(p.width)
 for(const [col,id]of ['desert-house','desert-tent','desert-temple'].entries()){
  const asset=registry.assets[id],[w,h]=asset.frame,[fx,fy]=asset.foot
  const left=cuts[col],cw=cuts[col+1]-left,b=bounds(p,left,0,cw,p.height)
  const scale=Math.min((w-12)/(b[2]-b[0]+1),(fy-8)/(b[3]-b[1]+1)),out=new PNG({width:w,height:h})
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const sx=Math.floor((x-fx)/scale+(b[0]+b[2])/2),sy=Math.floor((y-fy)/scale+b[3])
   if(sx<0||sx>=cw||sy<0||sy>=p.height)continue
   const at=(sy*p.width+left+sx)*4,to=(y*w+x)*4
   if(p.data[at+3]<128)continue
   for(let k=0;k<3;k++)out.data[to+k]=Math.min(255,Math.round(p.data[at+k]/8)*8)
   out.data[to+3]=255
  }
  const image=`tiny-swords/expansion/${id}.png`
  write('public/'+image,out)
  const state={image,frames:1,fps:1,visibleBounds:[bounds(out)]}
  asset.animations={stand:state,walk:state}
 }
}
export const EXPANSION_ACTORS={
 shaman:{rows:6,height:70,states:{stand:[0,6,1.5],walk:[1,6,10],attack:[2,6,16],heal:[3,6,9],hit:[4,2,10],death:[4,4,8,2]}},
 skeleton:{rows:6,height:66,states:{stand:[0,6,4],walk:[1,6,10],attack:[2,6,16],spawn:[3,6,9],hit:[4,2,10],death:[4,4,8,2]}},
 'desert-scorpion':{rows:4,height:57,states:{stand:[0,6,4],walk:[1,6,10],attack:[2,6,14],hit:[3,2,10],death:[3,4,8,2]}},
 'desert-serpent':{rows:4,height:74,states:{stand:[0,6,4],walk:[1,6,10],attack:[2,6,14],hit:[3,2,10],death:[3,4,8,2]}},
 'snow-polar-bear':{rows:4,height:82,states:{stand:[0,6,4],walk:[1,6,10],attack:[2,6,14],hit:[3,2,10],death:[3,4,8,2]}}
}
/** Source art is committed. No network generation is used by build or Docker.
 * One scale per atlas, nearest sampling, stable native 192px actor frames. */
export function compileExpansionArt(registry){
 for(const [id,spec] of Object.entries(EXPANSION_ACTORS)){
  const source=`art/generated-source/expansion/${id}.png`
  if(!fs.existsSync(path.join(root,source)))continue
  const rows=rowSlices(read(source),spec.rows,6),cw=Math.floor(rows[0].width/6)
  const idle=Array.from({length:6},(_,i)=>bounds(rows[0],i*cw,0,cw,rows[0].height))
  const scale=spec.height/Math.max(...idle.map(b=>b[3]-b[1]+1))
  const backFile=`art/generated-source/expansion/${id}-back.png`
  const back=fs.existsSync(path.join(root,backFile))?rowSlices(read(backFile),6,6):null
  const bw=back?Math.floor(back[0].width/6):cw
  const backScale=back?spec.height/Math.max(...Array.from({length:6},(_,i)=>{const b=bounds(back[0],i*bw,0,bw,back[0].height);return b[3]-b[1]+1})):scale
  const animations={}
  for(const [name,[row,count,fps,start=0]] of Object.entries(spec.states)){
   const directional=!!back||spec.rows===6&&['stand','walk'].includes(name)
   const out=new PNG({width:192*count,height:192*(directional?2:1)})
   const visibleBounds=[]
   for(let direction=0;direction<(directional?2:1);direction++)for(let i=0;i<count;i++){
    const backRows={stand:0,walk:1,attack:2,heal:3,spawn:3,hit:4,death:id==='skeleton'?4:5}
    const r=direction?(back?backRows[name]:5):row
    const frame=direction&&back?(id==='skeleton'&&name==='death'?start+i:i):start+i
    const src=direction&&back?back[r]:rows[r]
    const cellW=direction&&back?bw:cw,cellH=src.height
    const resize=direction&&back?backScale:scale
    const b=bounds(src,frame*cellW,0,cellW,cellH)
    const cx=(b[0]+b[2])/2,foot=b[3]
    for(let y=0;y<192;y++)for(let x=0;x<192;x++){
     // Rear skeleton action poses use the opposite sheet orientation. Keep
     // sword/shield handedness consistent with its rear idle silhouette.
     const mirror=id==='skeleton'&&direction&&back&&name!=='stand'
     const sx=Math.floor((mirror?96-x:x-96)/resize+cx),sy=Math.floor((y-132)/resize+foot)
     if(sx<0||sx>=cellW||sy<0||sy>=cellH)continue
     const at=(sy*src.width+frame*cellW+sx)*4
     if(src.data[at+3]<128)continue
     const to=((direction*192+y)*out.width+i*192+x)*4
     for(let k=0;k<3;k++)out.data[to+k]=Math.min(255,Math.round(src.data[at+k]/8)*8)
     out.data[to+3]=255
    }
    if(!direction)visibleBounds.push(bounds(out,i*192,0,192,192))
   }
   const image=`tiny-swords/expansion/${id}-${name}.png`
   write('public/'+image,out)
   animations[name]={image,frames:count,fps,visibleBounds,...(directional?{rows:2}:{})}
  }
  registry.assets[id]={kind:'actor',frame:[192,192],foot:[96,132],hitbox:[32,24],directional:true,animations}
  registry.generation[id]={source,scale,footPixels:Array.from({length:6},()=>[96,132])}
 }
 compileProps(registry)
 compileBuildings(registry)
 if(registry.assets['jungle-palm'])registry.assets['desert-palm']={...registry.assets['jungle-palm']}
 // Neutral wildlife shares the serpent's visual language, at a smaller native
 // size. It is a scenery event without BattleAi, never a hostile actor.
 if(registry.assets['desert-serpent']){
  const animations={}
  for(const name of ['stand','walk']){
   const state=registry.assets['desert-serpent'].animations[name]
   const src=read('public/'+state.image),out=new PNG({width:128*state.frames,height:128})
   for(let f=0;f<state.frames;f++)for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const sx=Math.floor((x-64)/.6+96),sy=Math.floor((y-88)/.6+132)
    if(sx<0||sy<0||sx>=192||sy>=192)continue
    const at=(sy*src.width+f*192+sx)*4,to=(y*out.width+f*128+x)*4
    out.data.set(src.data.subarray(at,at+4),to)
   }
   const image=`tiny-swords/expansion/desert-snake-${name}.png`
   write('public/'+image,out)
   animations[name]={image,frames:state.frames,fps:state.fps,
    visibleBounds:Array.from({length:state.frames},(_,i)=>bounds(out,i*128,0,128,128))}
  }
  registry.assets['desert-snake']={kind:'prop',frame:[128,128],foot:[64,88],hitbox:[32,20],
   solid:false,directional:true,animations}
 }
 return registry
}
export function updateExpansionRegistry(){
 const file=path.join(root,'src/art/registry.json')
 const registry=compileExpansionArt(JSON.parse(fs.readFileSync(file,'utf8')))
 fs.writeFileSync(file,JSON.stringify(registry,null,2)+'\n')
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))updateExpansionRegistry()
