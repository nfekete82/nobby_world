import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PNG} from 'pngjs'
import {styledBiomeProps} from './biome-props-style.mjs'

const folder=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/tiny-swords/biomes')
const C={
 ink:[58,52,49,255],shade:[102,73,54,255],sand:[218,173,104,255],
 plaster:[208,164,105,255],plasterLight:[240,206,143,255],clay:[169,110,68,255],
 roof:[172,89,57,255],roofLight:[218,122,66,255],door:[80,62,53,255],
 green:[52,127,96,255],greenLight:[91,164,102,255],greenDark:[34,90,77,255],
 gray:[111,114,109,255],stone:[152,144,125,255],stoneLight:[194,184,152,255],
 canvas:[215,173,122,255],canvasLight:[239,209,160,255],
 snow:[233,244,238,255],snowDark:[163,188,194,255]
}
const set=(p,x,y,c)=>{if(x<0||y<0||x>=p.width||y>=p.height)return;p.data.set(c,(y*p.width+x)*4)}
const rect=(p,x,y,w,h,c)=>{for(let yy=Math.max(0,y|0);yy<Math.min(p.height,y+h);yy++)for(let xx=Math.max(0,x|0);xx<Math.min(p.width,x+w);xx++)set(p,xx,yy,c)}
const ellipse=(p,x,y,rx,ry,c)=>{
 for(let py=Math.max(0,Math.floor(y-ry));py<Math.min(p.height,Math.ceil(y+ry));py++)
  for(let px=Math.max(0,Math.floor(x-rx));px<Math.min(p.width,Math.ceil(x+rx));px++)
   if(((px-x)/rx)**2+((py-y)/ry)**2<=1)set(p,px,py,c)
}
const triangle=(p,pts,c)=>{
 const xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1])
 for(let y=Math.max(0,Math.floor(Math.min(...ys)));y<=Math.min(p.height-1,Math.ceil(Math.max(...ys)));y++)
  for(let x=Math.max(0,Math.floor(Math.min(...xs)));x<=Math.min(p.width-1,Math.ceil(Math.max(...xs)));x++){
   let same=false
   for(let i=0,j=2;i<3;j=i++){
    const a=pts[i],b=pts[j]
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])same=!same
   }
   if(same)set(p,x,y,c)
  }
}
const hash=(x,y,seed=0)=>(Math.imul(x+seed+1,73856093)^Math.imul(y+17,19349663))>>>0
function cactus(p,small=false){
 const cx=p.width/2|0,base=p.height-15,top=small?43:20,half=small?5:7
 ellipse(p,cx,base,21,5,C.shade)
 rect(p,cx-half-2,top+1,2*half+4,base-top,C.ink)
 rect(p,cx-half,top,half*2,base-top-1,C.green)
 rect(p,cx-half+2,top+4,3,base-top-10,C.greenLight)
 // asymmetric curved arms, with long silhouette and light stripe
 const branches=small?[[cx+half,base-37,16,12],[cx-half-16,base-29,15,11]]:
 [[cx+half,base-52,19,14],[cx-half-19,base-35,18,12]]
 for(let n=0;n<branches.length;n++){
  const [x,y,w,h]=branches[n],right=n===0
  rect(p,x,y,w,h,C.ink)
  rect(p,x+2,y+2,w-4,h-4,C.greenDark)
  const xx=right?x+w-10:x+3,yy=right?y-22:y-26
  rect(p,xx-2,yy,11,y-yy+10,C.ink)
  rect(p,xx,yy+2,7,y-yy+6,C.green)
  rect(p,xx+1,yy+5,2,y-yy-1,C.greenLight)
 }
 for(let y=top+8;y<base-5;y+=12){set(p,cx-half-3,y,C.canvasLight);set(p,cx+half+1,y+3,C.canvasLight)}
}
function rock(p){
 ellipse(p,32,50,25,12,C.ink)
 ellipse(p,32,43,24,14,C.gray)
 triangle(p,[[10,45],[23,24],[39,40]],C.stone)
 triangle(p,[[28,44],[41,25],[54,43]],C.stoneLight)
 rect(p,20,35,5,2,C.snowDark)
 rect(p,42,42,8,2,C.shade)
 for(let i=0;i<28;i++){const x=8+hash(i,2)%48,y=25+hash(i,8)%26;if(hash(x,y)%4===0)set(p,x,y,C.stoneLight)}
}
function house(p,kind){
 const temple=kind==='temple',tent=kind==='tent'
 const y=temple?53:tent?65:61
 ellipse(p,64,174,54,9,C.shade)
 if(tent){
  triangle(p,[[12,162],[64,45],[116,162]],C.ink)
  triangle(p,[[18,159],[64,55],[110,159]],C.canvas)
  triangle(p,[[66,62],[64,157],[107,157]],C.roof)
  triangle(p,[[60,70],[54,160],[26,160]],C.canvasLight)
  triangle(p,[[51,162],[64,109],[81,162]],C.door)
  for(let j=0;j<6;j++)rect(p,24+j*14,161,3,5,C.shade)
  return
 }
 rect(p,18,y+28,92,84,C.ink)
 rect(p,21,y+32,86,78,C.plaster)
 rect(p,24,y+33,8,75,C.plasterLight)
 rect(p,100,y+33,6,75,C.clay)
 for(let a=0;a<48;a++){
  const x=23+hash(a,4)%82,yy=y+37+hash(a,9)%70
  if(hash(x,yy)%5===0)rect(p,x,yy,3,2,C.clay)
 }
 if(temple){
  rect(p,12,y+13,104,22,C.ink)
  rect(p,15,y+14,98,17,C.clay)
  rect(p,20,y+15,88,6,C.plasterLight)
  for(const x of [29,91]){rect(p,x-8,y+29,16,81,C.ink);rect(p,x-5,y+30,10,77,C.stoneLight)}
  rect(p,45,y+57,38,54,C.ink)
  ellipse(p,64,y+57,19,22,C.ink)
  rect(p,51,y+68,26,44,C.door)
  for(let j=0;j<5;j++)rect(p,32+j*14,y+5,9,9,C.plasterLight)
  return
 }
 triangle(p,[[13,y+35],[64,y-1],[115,y+35]],C.ink)
 triangle(p,[[20,y+33],[64,y+5],[108,y+33]],C.roof)
 for(let row=0;row<3;row++)
  for(let x=25+row*4;x<103-row*4;x+=13)rect(p,x,y+19+row*5,7,2,C.roofLight)
 rect(p,48,y+74,32,38,C.ink)
 rect(p,52,y+77,24,35,C.door)
 rect(p,55,y+79,3,26,C.clay)
 for(let x of [31,93]){
  rect(p,x-8,y+61,16,23,C.ink);rect(p,x-5,y+64,10,17,C.snowDark)
  rect(p,x-6,y+71,13,2,C.door)
 }
 rect(p,30,y+106,70,5,C.stoneLight)
}
function pine(p){
 const cx=64
 ellipse(p,cx,174,30,7,C.shade)
 rect(p,cx-6,131,12,43,C.clay)
 for(let level=0;level<4;level++){
  const y=22+level*31,spread=23+level*11
  triangle(p,[[cx,y-12],[cx-spread,y+46],[cx+spread,y+46]],C.ink)
  triangle(p,[[cx,y-7],[cx-spread+6,y+39],[cx+spread-6,y+39]],C.greenDark)
  triangle(p,[[cx-6,y+4],[cx-spread+10,y+31],[cx+spread-15,y+31]],C.snow)
  for(let x=cx-spread+12;x<cx+spread-12;x+=10){
   const yy=y+34+(hash(x,y)%5)
   rect(p,x,yy,6,3,C.snowDark)
  }
 }
}
// All biome assets are rendered with the same grouped-pixel art direction.
// Preserve native frames and registry ids so existing maps continue working.
const specs={
 'desert-cactus':[64,128,styledBiomeProps['desert-cactus']],
 'desert-cactus-small':[64,128,styledBiomeProps['desert-cactus-small']],
 'desert-rock':[64,64,styledBiomeProps['desert-rock']],
 'desert-house':[128,192,styledBiomeProps['desert-house']],
 'desert-tent':[128,192,styledBiomeProps['desert-tent']],
 'desert-temple':[128,192,styledBiomeProps['desert-temple']],
 'snow-pine':[128,192,styledBiomeProps['snow-pine']],
 'desert-agave':[64,64,styledBiomeProps['desert-agave']],
 'desert-shrub':[64,64,styledBiomeProps['desert-shrub']],
 'desert-prickly-pear':[64,64,styledBiomeProps['desert-prickly-pear']]
}
export const BIOME_PROP_SPECS=Object.fromEntries(Object.entries(specs).map(([k,[w,h]])=>[k,[w,h]]))
export function ensureBiomeProps(){
 fs.mkdirSync(folder,{recursive:true})
 const modified=fs.statSync(fileURLToPath(import.meta.url)).mtimeMs
 for(const [name,[width,height,draw]] of Object.entries(specs)){
  const output=path.join(folder,name+'.png')
  if(fs.existsSync(output)&&fs.statSync(output).mtimeMs>=modified)continue
  const png=new PNG({width,height});draw(png)
  fs.writeFileSync(output,PNG.sync.write(png))
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))ensureBiomeProps()
