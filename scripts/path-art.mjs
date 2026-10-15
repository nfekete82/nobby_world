import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

// Original 3x3 Tiny Swords path.png stays unchanged. Reversible derived
// sheets preserve alpha, 64px grid, collision footprint and existing tiles.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const folder=path.join(root,'src/tiled/tiny-swords')
export const BASE_GID=218
export const VARIANT_BASE_TILES=[57,59,60,61,63]
export const PATH_TILE_SIZE=64
const names=['path-earthy.png','path-details.png']
const idx=(img,x,y)=>((y*img.width+x)*4)
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)))
const alpha=(img,x,y)=>img.data[idx(img,x,y)+3]
export function nearTransparent(img,x,y,radius=6){
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
  if(dx*dx+dy*dy>radius*radius)continue
  const xx=x+dx,yy=y+dy
  if(xx<0||yy<0||xx>=img.width||yy>=img.height||alpha(img,xx,yy)<128)return true
 }
 return false
}
export function makeEarthyPath(src){
 if(src.width!==192||src.height!==192)throw Error('path.png must be a 192x192 / 3x3 tileset')
 const out=new PNG({width:src.width,height:src.height})
 out.data.set(src.data)
 let changed=0
 for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
  const i=idx(src,x,y)
  if(src.data[i+3]<128||!nearTransparent(src,x,y))continue
  const r=src.data[i],g=src.data[i+1],b=src.data[i+2]
  const cold=(g>r*1.07&&b>r*.77)||(b>r*1.1&&g>r*.82)
  const pale=r>150&&g>150&&b>135&&Math.abs(g-b)<66
  if(!cold&&!pale)continue
  const target=cold?[77,108,77]:[125,123,91],t=cold?.78:.43
  out.data[i]=clamp(r*(1-t)+target[0]*t)
  out.data[i+1]=clamp(g*(1-t)+target[1]*t)
  out.data[i+2]=clamp(b*(1-t)+target[2]*t)
  changed++
 }
 if(changed<30)throw Error('path.png has no recognizable pale-blue rim')
 return out
}
function copyTile(src,dst,sx,sy,tx,ty){
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const a=idx(src,sx*64+x,sy*64+y),b=idx(dst,tx*64+x,ty*64+y)
  dst.data.set(src.data.subarray(a,a+4),b)
 }
}
function soil(base,x,y){
 if(x<0||y<0||x>=64||y>=64)return false
 const i=idx(base,x,y),r=base.data[i],g=base.data[i+1],b=base.data[i+2]
 return base.data[i+3]>=200&&r>g*.98&&g>b*.98&&!nearTransparent(base,x,y,5)
}
const colors={
 outline:[103,94,76],stone:[140,137,118],stoneHighlight:[179,170,137],
 leafDark:[75,91,61],leaf:[119,139,77],leafLight:[160,164,97],
 woodDark:[100,77,53],wood:[148,111,68]
}
function stamp(img,base,kind,cx,cy){
 const paint=(x,y,color)=>{
  if(!soil(base,x,y))return
  img.data.set([...colors[color],255],idx(img,x,y))
 }
 const pixels=kind==='stone'?
  [[-2,0,'outline'],[-1,-1,'outline'],[0,-1,'stoneHighlight'],[1,-1,'outline'],[2,0,'outline'],[-1,0,'stone'],[0,0,'stone'],[1,0,'stone'],[-1,1,'outline'],[0,1,'outline'],[1,1,'outline']]:
  kind==='leaf'?
  [[-2,0,'leafDark'],[-1,-1,'leafDark'],[0,-1,'leafDark'],[1,0,'leafDark'],[-1,0,'leaf'],[0,0,'leafLight'],[0,1,'leafDark'],[1,1,'woodDark']]:
  [[-3,1,'woodDark'],[-2,1,'woodDark'],[-1,0,'woodDark'],[0,0,'woodDark'],[1,-1,'woodDark'],[2,-1,'woodDark'],[3,-2,'woodDark'],[-2,0,'wood'],[-1,-1,'wood'],[0,-1,'wood'],[1,-2,'wood'],[0,1,'woodDark']]
 for(const [dx,dy,col] of pixels)paint(cx+dx,cy+dy,col)
}
export function makePathDetails(earthy){
 const details=new PNG({width:320,height:128})
 const specs=[
  [['stone',24,36],['leaf',44,45]],
  [['twig',21,30],['stone',44,41]],
  [['leaf',38,23],['stone',24,45]],
  [['stone',30,24],['twig',40,47]],
  [['stone',20,27],['twig',41,42]],
  [['leaf',26,23],['stone',41,38]],
  [['twig',28,30],['leaf',39,45]],
  [['stone',40,27],['leaf',23,43]],
  [['leaf',23,28],['twig',40,41]],
  [['stone',28,42],['leaf',43,24]]
 ]
 for(let v=0;v<2;v++)for(let n=0;n<5;n++){
  const id=VARIANT_BASE_TILES[n]-56
  const base=new PNG({width:64,height:64})
  copyTile(earthy,base,id%3,Math.floor(id/3),0,0)
  const tile=new PNG({width:64,height:64})
  tile.data.set(base.data)
  for(const [type,x,y] of specs[n+5*v])stamp(tile,base,type,x,y)
  copyTile(tile,details,0,0,n,v)
 }
 return details
}
export function pathDetailGid(gid,x,y,mapSeed=0){
 const n=VARIANT_BASE_TILES.indexOf(gid)
 if(n<0)return gid
 const hash=(Math.imul(x+11,73856093)^Math.imul(y+17,19349663)^Math.imul(mapSeed+7,83492791))>>>0
 return hash%100<29?BASE_GID+n+5*((hash>>>8)&1):gid
}
export function preparePathArt(){
 const input=path.join(folder,'path.png'),files=names.map(n=>path.join(folder,n))
 const modified=Math.max(fs.statSync(input).mtimeMs,fs.statSync(fileURLToPath(import.meta.url)).mtimeMs)
 if(files.every(f=>fs.existsSync(f)&&fs.statSync(f).mtimeMs>=modified))return
 const earthy=makeEarthyPath(PNG.sync.read(fs.readFileSync(input)))
 fs.writeFileSync(files[0],PNG.sync.write(earthy))
 fs.writeFileSync(files[1],PNG.sync.write(makePathDetails(earthy)))
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 preparePathArt()
 console.log('Pfad mit erdig-dunklem Rand, Steinchen, Zweigen und Laub vorbereitet.')
}
