import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PNG} from 'pngjs'

// Original 9x6 Tiny Swords grass tile shapes; separate palette, shared alpha.
export const BIOME_PALETTES={
 desert:[131,164,101],
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
  // Preserve Tiny Swords boundary shapes, but recolor the formerly sandy
  // ground into muted green woodland meadow; no vector-looking land patches.
  const offset=Math.max(-92,Math.min(68,(luminance-119)*.84))
  const detail=(g-r)*.065
  const x=(i/4)%source.width|0,y=Math.floor(i/4/source.width)
  const hash=(Math.imul(x+19,92821)^Math.imul(y+71,68917))>>>0
  const meadow=color===BIOME_PALETTES.desert
  const ripple=0 // Dune lines look out of place once the land is green
  const grit=meadow?(hash%131===0?-9:hash%67===0?7:0):0
  const texture=ripple+grit
  out.data[i]=clamp(color[0]+offset+detail+texture)
  out.data[i+1]=clamp(color[1]+offset+detail+texture*.87)
  out.data[i+2]=clamp(color[2]+offset-detail+texture*.6)
  out.data[i+3]=a
 }
 return out
}
export function ensureBiomeTerrain(){
 const src=path.join(folder,'grass.png')
 const modified=Math.max(fs.statSync(src).mtimeMs,fs.statSync(fileURLToPath(import.meta.url)).mtimeMs)
 const targets=Object.keys(BIOME_PALETTES).map(name=>path.join(folder,name+'.png'))
 if(!targets.every(p=>fs.existsSync(p)&&fs.statSync(p).mtimeMs>=modified)){
  const base=PNG.sync.read(fs.readFileSync(src))
  if(base.width!==576||base.height!==384)throw Error('Unexpected Tiny Swords grass dimensions')
  for(const [name,palette] of Object.entries(BIOME_PALETTES))
   fs.writeFileSync(path.join(folder,name+'.png'),PNG.sync.write(recolorBiomePixels(base,palette)))
 }
 ensureBiomePaths()
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 ensureBiomeTerrain()

// Warm / snowy paths are transparent overlay tiles, not replacements for the
// normal road or for water. Their 3x3 outer/inner corners retain native alpha.
export function tintBiomePath(src,kind){
 if(src.width!==192||src.height!==192)throw Error('Path artwork requires a 3x3 64px grid')
 const out=new PNG({width:192,height:192})
 for(let i=0;i<src.data.length;i+=4){
  const a=src.data[i+3]
  out.data[i+3]=a
  if(!a)continue
  const brightness=(src.data[i]+src.data[i+1]+src.data[i+2])/3
  const dark=Math.max(-72,Math.min(46,(brightness-135)*.52))
  const x=(i/4)%192|0,y=Math.floor(i/4/192)
  const noise=((x*37+y*127+x*y*7)>>>0)%31===0?-13:0
  const c=kind==='desert'?[126,153,94]:[170,179,184]
  for(let k=0;k<3;k++)out.data[i+k]=clamp(c[k]+dark+noise)
 }
 return out
}
export function ensureBiomePaths(){
 const input=path.join(folder,'path-earthy.png')
 const modified=Math.max(fs.statSync(input).mtimeMs,fs.statSync(fileURLToPath(import.meta.url)).mtimeMs)
 for(const kind of ['desert','snow']){
  const output=path.join(folder,kind+'-path.png')
  if(fs.existsSync(output)&&fs.statSync(output).mtimeMs>=modified)continue
  const source=PNG.sync.read(fs.readFileSync(input))
  fs.writeFileSync(output,PNG.sync.write(tintBiomePath(source,kind)))
 }
}
