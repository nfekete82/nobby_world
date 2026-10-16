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

/**
 * 8-frame stepping cycle derived from the original Tiny Swords sheep.
 * Legs alternate and lift 1–2 source pixels. All wool, face, torso and the
 * sprite's 128px anchor stay fixed; no whole-sheep vertical translation.
 */
export const SHEEP_WALK_STEPS=Object.freeze([
 [0,0,0,0],[-1,-1,2,-2],[-2,-2,1,-1],[-1,-1,0,0],
 [0,0,0,0],[2,-2,-1,-1],[1,-1,-2,-2],[0,0,-1,-1]
])
export const SHEEP_WALK_FRAMES=SHEEP_WALK_STEPS.length
export const SHEEP_WALK_FPS=8
const walkOutput=path.join(root,'public/tiny-swords/biomes/sheep-walk.png')
// The native sheep's two dark hoof clusters are below its fixed wool outline.
// Do not include the broad torso or muzzle in either moving hoof region.
const backHoof=(x,y)=>y>=69&&x>=48&&x<64
const frontHoof=(x,y)=>y>=69&&x>=68&&x<=85

export function makeSheepWalkingFrames(source){
 if(source.width!==frame*6||source.height!==frame)
  throw Error('Sheep_Idle.png must be 6 × 128px frames')
 const out=new PNG({width:frame*SHEEP_WALK_FRAMES,height:frame})
 for(let n=0;n<SHEEP_WALK_FRAMES;n++){
  const [backDx,backDy,frontDx,frontDy]=SHEEP_WALK_STEPS[n]
  for(let y=0;y<frame;y++)for(let x=0;x<frame;x++){
   // Use the same resting base cell, never six slightly drifting idle poses.
   const from=(y*source.width+x)*4
   if(source.data[from+3]===0)continue
   let dx=0,dy=0
   if(backHoof(x,y)){dx=backDx;dy=backDy}
   else if(frontHoof(x,y)){dx=frontDx;dy=frontDy}
   const tx=x+dx,ty=y+dy
   if(tx<0||tx>=frame||ty<0||ty>=frame)continue
   const to=(ty*out.width+n*frame+tx)*4
   out.data.set(source.data.subarray(from,from+4),to)
  }
 }
 return out
}
export function ensureSheepWalk(){
 fs.mkdirSync(path.dirname(walkOutput),{recursive:true})
 const recipe=fs.statSync(fileURLToPath(import.meta.url)).mtimeMs
 if(fs.existsSync(walkOutput)&&fs.statSync(walkOutput).mtimeMs>=Math.max(recipe,fs.statSync(original).mtimeMs))return
 fs.writeFileSync(walkOutput,PNG.sync.write(makeSheepWalkingFrames(PNG.sync.read(fs.readFileSync(original)))))
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 ensureSheepGraze()
 ensureSheepWalk()
}
