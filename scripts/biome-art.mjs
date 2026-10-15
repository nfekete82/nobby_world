import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PNG} from 'pngjs'

// Original 9x6 Tiny Swords grass tile shapes; separate palette, shared alpha.
export const BIOME_PALETTES={
 desert:[211,174,110],
 rocky:[131,139,133],
 snow:[209,224,230]
}
const folder=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/tiled/tiny-swords')
const clamp=n=>Math.max(0,Math.min(255,Math.round(n)))
export function recolorBiomePixels(source,color){
 const out=new PNG({width:source.width,height:source.height})
 for(let i=0;i<source.data.length;i+=4){
  const r=source.data[i],g=source.data[i+1],b=source.data[i+2],a=source.data[i+3]
  if(!a){out.data.set(source.data.subarray(i,i+4),i);continue}
  const luminance=.2126*r+.7152*g+.0722*b
  const offset=Math.max(-92,Math.min(68,(luminance-119)*.84))
  const detail=(g-r)*.065
  out.data[i]=clamp(color[0]+offset+detail)
  out.data[i+1]=clamp(color[1]+offset+detail)
  out.data[i+2]=clamp(color[2]+offset-detail)
  out.data[i+3]=a
 }
 return out
}
export function ensureBiomeTerrain(){
 const src=path.join(folder,'grass.png')
 const modified=Math.max(fs.statSync(src).mtimeMs,fs.statSync(fileURLToPath(import.meta.url)).mtimeMs)
 const targets=Object.keys(BIOME_PALETTES).map(name=>path.join(folder,name+'.png'))
 if(targets.every(p=>fs.existsSync(p)&&fs.statSync(p).mtimeMs>=modified))return
 const base=PNG.sync.read(fs.readFileSync(src))
 if(base.width!==576||base.height!==384)throw Error('Unexpected Tiny Swords grass dimensions')
 for(const [name,palette] of Object.entries(BIOME_PALETTES))
  fs.writeFileSync(path.join(folder,name+'.png'),PNG.sync.write(recolorBiomePixels(base,palette)))
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 ensureBiomeTerrain()
