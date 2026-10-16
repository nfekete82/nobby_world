import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PNG} from 'pngjs'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
export const NATIVE_SHAMAN_STATES=Object.freeze({
 stand:{source:'Idle',poses:[0,1,2,3,4,5],fps:0.5},
 walk:{source:'Run',poses:[0,1,2,3],fps:12},
 attack:{source:'Heal',poses:[0,1,2,3,7,10],fps:16},
 heal:{source:'Heal',poses:[0,1,2,3,4,5,6,7,8,9,10],fps:9},
 hit:{source:'Idle',poses:[0,1],fps:10},
 death:{source:'Idle',poses:[0,1,1,1],fps:8}
})
const bounds=(p,f)=>{
 let b=[192,192,-1,-1]
 for(let y=0;y<192;y++)for(let x=0;x<192;x++)if(p.data[(y*p.width+f*192+x)*4+3])
  b=[Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)]
 if(b[2]<0)throw Error('Empty native shaman frame')
 return b
}
/** Reviewed native-sized source PNGs are copied without pose transforms. */
export function ensureNativeShaman(registry){
 const animations={}
 for(const [state,spec] of Object.entries(NATIVE_SHAMAN_STATES)){
  const file=state==='walk'?'shaman-run.png':`shaman-native-${state}.png`
  const bytes=fs.readFileSync(path.join(root,'art/generated-source/expansion',file))
  const p=PNG.sync.read(bytes),count=spec.poses.length
  if(p.width!==192*count||p.height!==384)throw Error('Invalid native shaman source geometry: '+state)
  const image=`tiny-swords/expansion/shaman-${state}.png`
  const outputs=[image,...(state==='walk'?['tiny-swords/biomes/shaman-natural-walk.png']:[])]
  for(const relative of outputs){
   const dest=path.join(root,'public',relative)
   if(fs.existsSync(dest)&&fs.readFileSync(dest).equals(bytes))continue
   fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes)
  }
  animations[state]={image:state==='walk'?'tiny-swords/biomes/shaman-natural-walk.png':image,
   frames:count,fps:spec.fps,rows:2,visibleBounds:Array.from({length:count},(_,f)=>bounds(p,f))}
 }
 if(registry){
  registry.assets.shaman={kind:'actor',frame:[192,192],foot:[96,132],hitbox:[32,24],directional:true,animations}
  registry.generation.shaman={source:'public/tiny-swords/Units/Blue Units/Monk/Idle.png',
   walkSource:'public/tiny-swords/Units/Blue Units/Monk/Run.png',
   healSource:'public/tiny-swords/Units/Blue Units/Monk/Heal.png',
   identitySource:'art/generated-source/expansion/shaman-native-patches.json',scale:1,
   footPixels:Array.from({length:6},()=>[96,132])}
 }
 return animations
}
