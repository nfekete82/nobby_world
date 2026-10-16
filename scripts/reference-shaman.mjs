// Nobby World paint-over shaman. The reference PNG is the only authored master;
// all runtime states are deterministic 192px pixel transforms of that identity.
// Original Tiny Swords pack assets are never changed.
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PNG} from 'pngjs'
import {atomicWrite} from './editor-storage.mjs'
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
export const SHAMAN_REFERENCE='art/generated-source/expansion/shaman-reference-frame.png'
const FRAME=192,BASE=path.join(ROOT,SHAMAN_REFERENCE)
const STATES=Object.freeze({
 stand:{frames:8,fps:5},
 walk:{frames:4,fps:12},
 attack:{frames:6,fps:16},
 heal:{frames:11,fps:9},
 hit:{frames:2,fps:10},
 death:{frames:4,fps:8}
})
const phase=[0,-1,0,1,0,-1,0,1]
function set(p,x,y,rgba){
 if(x<0||x>=FRAME||y<0||y>=FRAME)return
 p.data.set(rgba,(y*FRAME+x)*4)
}
function sprite(source,state,frame,rear){
 const p=new PNG({width:FRAME,height:FRAME})
 const breathing=phase[frame%8]
 const gait=state==='walk'?[0,1,0,-1][frame%4]:0
 const lift=state==='walk'?[0,1,0,1][frame%4]:0
 for(let y=0;y<FRAME;y++)for(let x=0;x<FRAME;x++){
  const i=(y*FRAME+x)*4,alpha=source.data[i+3]
  if(alpha<128)continue
  let tx=x,ty=y
  // Foot contact and sprite anchor never move horizontally or vertically.
  // Only the upper silhouette and bottom robe follow tiny authored phases.
  if(y<103)ty+=breathing
  if(state==='walk'&&y>=119){tx+=x<103?gait:-gait;ty-=lift&&y<133?1:0}
  if(state==='hit'&&frame===1&&y<118)tx--
  const rgba=[source.data[i],source.data[i+1],source.data[i+2],255]
  if(rear){
   // Replace the face/eyebrow/beard highlights with a rear-facing hair mass.
   // Keep the exterior contour and the raised staff silhouette unchanged.
   if(y>=75&&y<=101&&x>=99&&x<=113&&x<120)
    rgba.splice(0,3,...(y<85?[57,35,40]:[41,29,36]))
   if(y>=104&&y<=119&&x>=91&&x<=109&&rgba[0]>140&&rgba[1]>95)
    rgba.splice(0,3,92,56,52)
  }
  // A faint cyan staff focus varies during attack/heal. No full-screen VFX.
  if((state==='attack'||state==='heal')&&rgba[2]>130&&rgba[1]>90&&rgba[2]>rgba[0]*1.3){
   const light=(frame%4)*5
   rgba[1]=Math.min(255,rgba[1]+light)
   rgba[2]=Math.min(255,rgba[2]+light)
  }
  if(state==='hit'&&frame===1&&rgba[0]>80&&rgba[2]<130){
   rgba[0]=Math.min(255,rgba[0]+12)
  }
  set(p,tx,ty,rgba)
 }
 if(state==='attack'||state==='heal'){
  const pulse=state==='heal'?frame%5:frame%3
  for(let j=0;j<pulse;j++)set(p,140+j*2,69-j*3,[87,223,238,255])
 }
 if(state==='death'&&frame>=2){
  const fallen=new PNG({width:FRAME,height:FRAME})
  for(let y=0;y<FRAME;y++)for(let x=0;x<FRAME;x++){
   const a=(y*FRAME+x)*4
   if(p.data[a+3]===0)continue
   // Quarter turn around the body center, then settle on the ground.
   const dx=96+Math.round((y-92)*.95)
   const dy=136-(x-98)
   set(fallen,dx,dy,p.data.subarray(a,a+4))
  }
  return fallen
 }
 return p
}
function visible(p,sheetWidth,col,row){
 let minX=FRAME,minY=FRAME,maxX=-1,maxY=-1
 for(let y=0;y<FRAME;y++)for(let x=0;x<FRAME;x++){
  if(p.data[((row*FRAME+y)*sheetWidth+col*FRAME+x)*4+3]===0)continue
  minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)
 }
 if(maxX<0)throw Error('Empty shaman frame '+row+'/'+col)
 return [minX,minY,maxX,maxY]
}
export function ensureReferenceShaman(registry){
 if(!fs.existsSync(BASE))throw Error('Missing authored shaman reference: '+SHAMAN_REFERENCE)
 const base=PNG.sync.read(fs.readFileSync(BASE))
 if(base.width!==FRAME||base.height!==FRAME)throw Error('Shaman reference must be 192x192')
 const animations={}
 for(const [state,spec]of Object.entries(STATES)){
  const out=new PNG({width:FRAME*spec.frames,height:FRAME*2})
  for(let row=0;row<2;row++)for(let frame=0;frame<spec.frames;frame++){
   const pose=sprite(base,state,frame,row===1)
   PNG.bitblt(pose,out,0,0,FRAME,FRAME,frame*FRAME,row*FRAME)
  }
  const image=state==='walk'?'tiny-swords/biomes/shaman-natural-walk.png':'tiny-swords/expansion/shaman-'+state+'.png'
  const destinations=[image,...(state==='walk'?['tiny-swords/expansion/shaman-walk.png']:[])]
  const bytes=PNG.sync.write(out)
  for(const dest of destinations){
   const full=path.join(ROOT,'public',dest)
   if(fs.existsSync(full)&&fs.readFileSync(full).equals(bytes))continue
   fs.mkdirSync(path.dirname(full),{recursive:true})
   atomicWrite(full,bytes)
  }
  const visibleBounds=Array.from({length:spec.frames},(_,i)=>visible(out,out.width,i,0))
  animations[state]={image,frames:spec.frames,fps:spec.fps,rows:2,visibleBounds}
 }
 if(registry){
  registry.assets.shaman={kind:'actor',frame:[192,192],foot:[96,132],hitbox:[32,24],directional:true,animations}
  registry.generation.shaman={source:SHAMAN_REFERENCE,scale:1,footPixels:Array.from({length:8},()=>[96,132]),
   note:'Authorial paint-over master; every directional gameplay state generated from the same character'}
 }
 return animations
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const file=path.join(ROOT,'art/registry-base.json')
 const registry=JSON.parse(fs.readFileSync(file,'utf8'))
 ensureReferenceShaman(registry)
 fs.writeFileSync(file,JSON.stringify(registry,null,2)+'\n')
}
