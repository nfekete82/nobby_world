import { PNG } from 'pngjs'
import { alternateShamanFeet } from './shaman-gait.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FRAME=192
const COUNT=6
const ROWS=2
const WALK_CADENCE_FPS=12 // Matches the native Tiny Swords Warrior_Run animation.
export { WALK_CADENCE_FPS }

/**
 * Use the SHAMAN'S SIX REAL WALKING POSES, not an idle torso pasted above
 * animated legs. The prior version made the character stiff because the
 * face, beard, clothing, staff and arms never moved at all.
 *
 * Native warrior-style cycle: six complete poses at 12 FPS, grounded on the
 * fixed 192px sprite cell. Only remove accidental horizontal torso drift
 * (a maximum of two original pixels) before each frame is displayed.
 * Legs, cape, staff and arms are never cut out, frozen, or interpolated.
 */
export function stabilizeShamanWalk(standing, walking) {
 if(standing.width!==FRAME*COUNT||walking.width!==FRAME*COUNT||
    standing.height!==FRAME*ROWS||walking.height!==FRAME*ROWS)
   throw Error('Shaman walk requires two 6×192px directional sheets')
 const result=new PNG({width:walking.width,height:walking.height})
 for(let row=0;row<ROWS;row++){
  // A stable torso midpoint is more reliable than a changing sword/staff
  // silhouette and does not erase the character's natural step cycle.
  const centers=[]
  for(let f=0;f<COUNT;f++){
   let sum=0,opaque=0
   for(let y=80;y<116;y++)for(let x=72;x<121;x++){
    const i=((row*FRAME+y)*walking.width+f*FRAME+x)*4
    if(walking.data[i+3]<128)continue
    sum+=x;opaque++
   }
   if(opaque<80)throw Error('Shaman torso missing: '+row+'/'+f)
   centers.push(sum/opaque)
  }
  const sorted=[...centers].sort((a,b)=>a-b)
  const anchor=(sorted[2]+sorted[3])/2
  for(let f=0;f<COUNT;f++){
   const shiftX=Math.max(-2,Math.min(2,Math.round(anchor-centers[f])))
   for(let y=0;y<FRAME;y++)for(let x=0;x<FRAME;x++){
    const fromX=x-shiftX
    if(fromX<0||fromX>=FRAME)continue
    const src=((row*FRAME+y)*walking.width+f*FRAME+fromX)*4
    const dst=((row*FRAME+y)*result.width+f*FRAME+x)*4
    result.data.set(walking.data.subarray(src,src+4),dst)
   }
  }
 }
 // Horizontal jitter is corrected above; the separate gait compositor
 // now makes the two feet alternate which leg plants on the ground.
 return alternateShamanFeet(result)
}

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const standSource=path.join(root,'public/tiny-swords/expansion/shaman-stand.png')
const walkSource=path.join(root,'public/tiny-swords/expansion/shaman-walk.png')
const naturalOutput=path.join(root,'public/tiny-swords/biomes/shaman-natural-walk.png')

/** Always generate a derived image; leave the authored sprite atlas intact. */
export function ensureNaturalShamanWalk(){
 if(!fs.existsSync(standSource)||!fs.existsSync(walkSource))
  throw Error('Source shaman animation sprites missing')
 fs.mkdirSync(path.dirname(naturalOutput),{recursive:true})
 const newest=Math.max(fs.statSync(standSource).mtimeMs,fs.statSync(walkSource).mtimeMs,
  fs.statSync(fileURLToPath(import.meta.url)).mtimeMs)
 if(fs.existsSync(naturalOutput)&&fs.statSync(naturalOutput).mtimeMs>=newest)return
 const standing=PNG.sync.read(fs.readFileSync(standSource))
 const walking=PNG.sync.read(fs.readFileSync(walkSource))
 fs.writeFileSync(naturalOutput,PNG.sync.write(stabilizeShamanWalk(standing,walking)))
}
