import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PNG} from 'pngjs'

// Preserve the licensed sheep source. Its wool/body/feet must stay stationary:
// only the face and neck lower, hold on the grass, and rise again.
export const SHEEP_GRAZE_DIP=Object.freeze([0,1,3,4,4,4,4,3,1,0])
export const SHEEP_GRAZE_FRAMES=SHEEP_GRAZE_DIP.length
export const SHEEP_GRAZE_FPS=3
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const original=path.join(root,'public/tiny-swords/Terrain/Resources/Meat/Sheep/Sheep_Idle.png')
const output=path.join(root,'public/tiny-swords/biomes/sheep-graze.png')
const frame=128
// Pixel-art head mask for the existing right-facing native Sheep_Idle pose.
// This keeps all wool and feet fixed; only muzzle/neck pixels move.
const headPixel=(x,y)=>x>=70&&y>=56&&(x>=75||y>=64)
export function makeSheepGrazingFrames(source){
 if(source.width!==frame*6||source.height!==frame)
  throw Error('Sheep_Idle.png must be 6 × 128px frames')
 const out=new PNG({width:frame*SHEEP_GRAZE_FRAMES,height:frame})
 for(let n=0;n<SHEEP_GRAZE_FRAMES;n++){
  const dip=SHEEP_GRAZE_DIP[n]
  // Always use one original standing pose: never shift the full body.
  for(let y=0;y<frame;y++)for(let x=0;x<frame;x++){
   if(headPixel(x,y))continue
   const at=(y*source.width+x)*4,to=(y*out.width+n*frame+x)*4
   out.data.set(source.data.subarray(at,at+4),to)
  }
  // Lower the isolated muzzle by up to four original pixel rows. Four
  // identical bottom poses create a perceptible pause before rising.
  for(let y=0;y<frame-dip;y++)for(let x=0;x<frame;x++){
   if(!headPixel(x,y))continue
   const at=(y*source.width+x)*4
   if(!source.data[at+3])continue
   const to=((y+dip)*out.width+n*frame+x)*4
   out.data.set(source.data.subarray(at,at+4),to)
  }
 }
 return out
}
export function ensureSheepGraze(){
 fs.mkdirSync(path.dirname(output),{recursive:true})
 const recipe=fs.statSync(fileURLToPath(import.meta.url)).mtimeMs
 if(fs.existsSync(output)&&fs.statSync(output).mtimeMs>=Math.max(recipe,fs.statSync(original).mtimeMs))return
 const source=PNG.sync.read(fs.readFileSync(original))
 fs.writeFileSync(output,PNG.sync.write(makeSheepGrazingFrames(source)))
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))ensureSheepGraze()
