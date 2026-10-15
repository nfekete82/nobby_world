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
 'desert-house':[128,192],
 'desert-tent':[128,192],
 'desert-temple':[192,320],
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
  if(fs.existsSync(output)&&fs.statSync(output).mtimeMs>=modified)continue
  const png=new PNG({width,height})
  if(ORIGINAL_GREEN_BUILDINGS[id])png.data.set(renderOriginalGreenBuilding(id).data)
  else render(png)
  let opaque=0
  for(let i=3;i<png.data.length;i+=4)if(png.data[i]===255)opaque++
  if(opaque<150)throw Error('Empty or undersized biome sprite: '+id)
  fs.writeFileSync(output,PNG.sync.write(png))
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 ensureBiomeProps()
