// Native Tiny Swords body poses, edited identity pixels and separately authored
// rear head. Every robe/leg/arm pose comes from the supplied Monk animations.
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PNG} from 'pngjs'
import {NATIVE_SHAMAN_STATES} from './native-shaman.mjs'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const base=path.join(root,'art/generated-source/expansion')
const patches=JSON.parse(fs.readFileSync(path.join(base,'shaman-native-patches.json')))
const palette=patches.palette
const sources=Object.fromEntries(['Idle','Run','Heal'].map(name=>[name,
 PNG.sync.read(fs.readFileSync(path.join(root,`public/tiny-swords/Units/Blue Units/Monk/${name}.png`)))]))
const color=(key)=>({
 '22,28,46':palette.o,'72,88,132':palette.d,'70,151,172':palette.t,
 '94,84,85':palette.b,'151,123,107':palette.h
}[key])
function paint(p,ox,oy,lines,brush=1){
 for(let y=0;y<lines.length;y++)for(let x=0;x<lines[y].length;x++){
  const c=palette[lines[y][x]];if(!c)continue
  for(let yy=0;yy<brush;yy++)for(let xx=0;xx<brush;xx++){
   const dx=ox+x*brush+xx,dy=oy+y*brush+yy
   if(dx<0||dx>=192||dy<0||dy>=192)throw Error('Identity patch outside native frame')
   p.data.set(c,(dy*192+dx)*4)
  }
 }
}
function overlay(to,from){for(let i=0;i<from.data.length;i+=4)if(from.data[i+3])to.data.set(from.data.subarray(i,i+4),i)}
function makePose(source,frame,rear,closed=false){
 const body=new PNG({width:192,height:192})
 let scalpTop=192,handX=0,handY=0,handPixels=0
 for(let y=50;y<100;y++)for(let x=75;x<120;x++){
  const i=(y*source.width+frame*192+x)*4
  if(source.data[i+3]===255&&(source.data[i]===239||source.data[i]===200))scalpTop=Math.min(scalpTop,y)
 }
 const headDy=scalpTop-68
 for(let y=0;y<192;y++)for(let x=0;x<192;x++){
  const i=(y*source.width+frame*192+x)*4
  if(source.data[i+3]!==255)continue // Native matte ground shadow is not a body pixel.
  const key=Array.from(source.data.subarray(i,i+3)).join(',')
  if(y<105+headDy&&x>=68&&x<=124)continue // Replace the head, not the native body.
  let c=color(key)||source.data.subarray(i,i+4)
  if(rear&&y>=105&&y<=118&&x>=94&&x<=118&&['200,168,118','239,225,171'].includes(key))c=palette.t
  body.data.set(c,(y*192+x)*4)
  if(x>=124&&y>=99&&y<=119&&['200,168,118','239,225,171'].includes(key)){
   handX+=x;handY+=y;handPixels++
  }
 }
 paint(body,patches.headOrigin[0],patches.headOrigin[1]+headDy,rear?patches.headRear:closed?patches.headClosed:patches.headFront,patches.headBrush)
 paint(body,patches.bunOrigin[0],patches.bunOrigin[1]+headDy,patches.bun)
 const out=new PNG({width:192,height:192})
 if(handPixels){
  const hx=Math.round(handX/handPixels),hy=Math.round(handY/handPixels)
  paint(out,hx-4,hy-29,patches.staff)
 }else{
  // Idle monk clasps his hands in front. A separate pixel-drawn diagonal staff
  // passes through that original grip without adding a second hand.
  paint(out,96,82,patches.staffLean)
 }
 overlay(out,body) // The original native hand occludes/grips the wooden shaft.
 return out
}
function fallen(p){
 const out=new PNG({width:192,height:192})
 let maxX=0
 for(let y=0;y<192;y++)for(let x=0;x<192;x++)if(p.data[(y*192+x)*4+3])maxX=Math.max(maxX,x)
 // Exact 90-degree pixel rotation for the final prone death poses. No blur,
 // arbitrary-angle resampling or sprite stretching; ground remains at y=132.
 for(let y=0;y<192;y++)for(let x=0;x<192;x++){
  const i=(y*192+x)*4;if(!p.data[i+3])continue
  const dx=96+105-y,dy=132-maxX+x
  if(dx<0||dx>=192||dy<0||dy>=192)throw Error('Death pose outside cell')
  out.data.set(p.data.subarray(i,i+4),(dy*192+dx)*4)
 }
 return out
}
export function authorNativeShaman(){
 for(const [state,spec] of Object.entries(NATIVE_SHAMAN_STATES)){
  const out=new PNG({width:192*spec.poses.length,height:384})
  for(let row=0;row<2;row++)for(let f=0;f<spec.poses.length;f++){
   let pose=makePose(sources[spec.source],spec.poses[f],row===1,
    state==='death'&&f>=2||state==='heal'&&f>=3&&f<=8)
   if(state==='death'&&f>=2)pose=fallen(pose)
   PNG.bitblt(pose,out,0,0,192,192,f*192,row*192)
  }
  const name=state==='walk'?'shaman-run.png':`shaman-native-${state}.png`
  fs.writeFileSync(path.join(base,name),PNG.sync.write(out))
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))authorNativeShaman()
