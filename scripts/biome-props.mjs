import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PNG} from 'pngjs'
import {styledBiomeProps} from './biome-props-style.mjs'
import {renderOriginalGreenBuilding,ORIGINAL_GREEN_BUILDINGS} from './green-native-buildings.mjs'

// Native sprite frames and placement contracts must remain stable: existing
// Tiled maps refer to these ids and the art registry defines collisions.
const folder=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/tiny-swords/biomes')
const sizes={
 'desert-cactus':[64,128],
 'desert-cactus-small':[64,128],
 'desert-rock':[64,64],
 'desert-house':[192,192],
 'desert-tent':[320,192],
 'desert-temple':[256,192],
 'snow-pine':[128,192],
 'desert-agave':[64,64],
 'desert-shrub':[64,64],
 'desert-prickly-pear':[64,64]
}
export const BIOME_PROP_SPECS=Object.freeze(sizes)
export function ensureBiomeProps(){
 fs.mkdirSync(folder,{recursive:true})
 const modified=Math.max(
  fs.statSync(fileURLToPath(import.meta.url)).mtimeMs,
  fs.statSync(new URL('./biome-props-style.mjs',import.meta.url)).mtimeMs,
  fs.statSync(new URL('./green-native-buildings.mjs',import.meta.url)).mtimeMs
 )
 for(const [id,[width,height]] of Object.entries(sizes)){
  const render=styledBiomeProps[id]
  if(typeof render!=='function')throw Error('Missing biome renderer: '+id)
  const output=path.join(folder,id+'.png')
  const illustrated=path.resolve(folder,'../illustrated',id+'.png')
  const sourcePresent=fs.existsSync(illustrated)
  const latest=sourcePresent?Math.max(modified,fs.statSync(illustrated).mtimeMs):modified
  if(fs.existsSync(output)&&fs.statSync(output).mtimeMs>=latest)continue
  // Genuine hand-painted PNG from the project's committed art sheet wins
  // over all procedural placeholder art. Builds require no manual downloads.
  let png
  if(sourcePresent)png=PNG.sync.read(fs.readFileSync(illustrated))
  else if(ORIGINAL_GREEN_BUILDINGS[id]){
   const native=renderOriginalGreenBuilding(id)
   png=new PNG({width,height})
   // Missing optional sources: keep the original Pixel Frog art, preserving
   // its native shape and alpha while centering in the new frame.
   const offX=Math.floor((width-native.width)/2),offY=height-native.height
   PNG.bitblt(native,png,0,0,native.width,Math.min(native.height,height),offX,Math.max(0,offY))
  }else{
   png=new PNG({width,height})
   render(png)
  }
  if(png.width!==width||png.height!==height)
   throw Error(id+': art frame must be '+width+'x'+height+', got '+png.width+'x'+png.height)
  let opaque=0
  for(let i=3;i<png.data.length;i+=4)if(png.data[i]===255)opaque++
  if(opaque<150)throw Error('Empty or undersized biome sprite: '+id)
  fs.writeFileSync(output,PNG.sync.write(png))
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 ensureBiomeProps()
