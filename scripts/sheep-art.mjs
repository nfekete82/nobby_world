import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PNG} from 'pngjs'

// Derive a grazing loop from the installed sheep sheet without changing
// licensed source art: slow body dip + a few nibbled meadow blades.
export const SHEEP_GRAZE_FRAMES=6
export const SHEEP_GRAZE_FPS=3
export const SHEEP_GRAZE_DIP=[0,2,4,5,3,1]
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const original=path.join(root,'public/tiny-swords/Terrain/Resources/Meat/Sheep/Sheep_Idle.png')
const output=path.join(root,'public/tiny-swords/biomes/sheep-graze.png')
const frame=128
const draw=(png,x,y,c)=>{
 if(x<0||x>=png.width||y<0||y>=png.height)return
 png.data.set(c,(y*png.width+x)*4)
}
export function makeSheepGrazingFrames(source){
 if(source.width!==frame*SHEEP_GRAZE_FRAMES||source.height!==frame)
  throw Error('Sheep_Idle.png must be 6 × 128px frames')
 const out=new PNG({width:source.width,height:source.height})
 for(let n=0;n<SHEEP_GRAZE_FRAMES;n++){
  const shift=SHEEP_GRAZE_DIP[n]
  for(let y=0;y<frame;y++)for(let x=0;x<frame;x++){
   const src=(y*source.width+n*frame+x)*4
   const a=source.data[src+3]
   const yy=y+shift
   if(!a||yy>=frame)continue
   const dst=(yy*out.width+n*frame+x)*4
   out.data.set(source.data.subarray(src,src+4),dst)
  }
  // Tiny grass tufts in front of the lowered muzzle; asymmetric animation.
  const blades=n%3===0?1:n%3===1?3:4
  for(let i=0;i<blades;i++){
   const gx=n*frame+47+i*4,gy=87+(i%2)
   draw(out,gx,gy,[58,115,56,255])
   draw(out,gx+1,gy-3,[85,143,65,255])
   draw(out,gx-1,gy-1,[93,153,66,255])
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
