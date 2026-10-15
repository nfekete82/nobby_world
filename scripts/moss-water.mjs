import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PNG} from 'pngjs'

// Match the forest's muted moss palette without altering the underlying
// water collision, shore foam animation, lake outlines or map data.
const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/tiled/tiny-swords')
const clamp=n=>Math.max(0,Math.min(255,Math.round(n)))
export function mossWaterPixels(source){
 const out=new PNG({width:source.width,height:source.height})
 for(let i=0;i<source.data.length;i+=4){
  const r=source.data[i],g=source.data[i+1],b=source.data[i+2],a=source.data[i+3]
  const luminance=.23*r+.64*g+.13*b
  const shade=(luminance-146)*.42
  out.data[i]=clamp(57+shade)
  out.data[i+1]=clamp(131+shade*.78)
  out.data[i+2]=clamp(113+shade*.68)
  out.data[i+3]=a
 }
 return out
}
export function ensureMossWater(){
 const input=path.join(directory,'water.png')
 const output=path.join(directory,'water-moss.png')
 const modified=Math.max(fs.statSync(input).mtimeMs,fs.statSync(fileURLToPath(import.meta.url)).mtimeMs)
 if(fs.existsSync(output)&&fs.statSync(output).mtimeMs>=modified)return
 const source=PNG.sync.read(fs.readFileSync(input))
 if(source.width!==64||source.height!==64)throw Error('Expected 64x64 original water source')
 fs.writeFileSync(output,PNG.sync.write(mossWaterPixels(source)))
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))ensureMossWater()
