// Shaman is repainted independently on each original Tiny Swords Monk pose.
// Never derive walking legs or cast arms from one static sprite.
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PNG} from 'pngjs'
import {atomicWrite} from './editor-storage.mjs'
import {authorNativeShaman} from './author-native-shaman.mjs'
import {NATIVE_SHAMAN_STATES} from './shaman-native-spec.mjs'
export {NATIVE_SHAMAN_STATES} from './shaman-native-spec.mjs'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const bounds=(p,f)=>{
 let b=[192,192,-1,-1]
 for(let y=0;y<192;y++)for(let x=0;x<192;x++)if(p.data[(y*p.width+f*192+x)*4+3])
  b=[Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)]
 if(b[2]<0)throw Error('Empty native shaman frame '+f)
 return b
}
export function ensureNativeShaman(registry){
 // Rebuild from actual Monk Idle/Run/Heal body poses, never from the old
 // shaman-reference-frame.png. The original licensed master stays unchanged.
 authorNativeShaman()
 const animations={}
 for(const [state,spec] of Object.entries(NATIVE_SHAMAN_STATES)){
  const name=state==='walk'?'shaman-run.png':`shaman-native-${state}.png`
  const file=path.join(root,'art/generated-source/expansion',name)
  const bytes=fs.readFileSync(file),p=PNG.sync.read(bytes),count=spec.poses.length
  if(p.width!==192*count||p.height!==384)throw Error('Invalid authored Monk pose geometry: '+state)
  const image=state==='walk'?'tiny-swords/biomes/shaman-natural-walk.png':`tiny-swords/expansion/shaman-${state}.png`
  const targets=[image,...(state==='walk'?['tiny-swords/expansion/shaman-walk.png']:[])]
  for(const target of targets){
   const full=path.join(root,'public',target)
   if(fs.existsSync(full)&&fs.readFileSync(full).equals(bytes))continue
   fs.mkdirSync(path.dirname(full),{recursive:true})
   atomicWrite(full,bytes)
  }
  animations[state]={image,frames:count,fps:spec.fps,rows:2,visibleBounds:Array.from({length:count},(_,f)=>bounds(p,f))}
 }
 if(registry){
  registry.assets.shaman={kind:'actor',frame:[192,192],foot:[96,132],hitbox:[32,24],directional:true,animations}
  registry.generation.shaman={
   source:'public/tiny-swords/Units/Blue Units/Monk/Idle.png',
   walkSource:'public/tiny-swords/Units/Blue Units/Monk/Run.png',
   healSource:'public/tiny-swords/Units/Blue Units/Monk/Heal.png',
   identitySource:'art/generated-source/expansion/shaman-native-patches.json',
   scale:1,footPixels:Array.from({length:6},()=>[96,132]),
   note:'Each complete body pose repainted independently over authored Monk animations'
  }
 }
 return animations
}
