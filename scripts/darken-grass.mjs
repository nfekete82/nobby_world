import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

// Subtle, uniform brightness adjustment of grass/forest Tiled tilesets.
// Original pixel art stays intact. Other layers (paths, water, buildings,
// characters, etc.) are not processed.
export const GRASS_BRIGHTNESS=0.80
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const entries=[
 ['grass.png','grass-darker.png'],
 ['forest.png','forest-darker.png'],
]
export function dimGrassPixels(source){
 const output=new PNG({width:source.width,height:source.height})
 for(let p=0;p<source.data.length;p+=4){
  const alpha=source.data[p+3]
  for(let i=0;i<3;i++)output.data[p+i]=alpha?Math.round(source.data[p+i]*GRASS_BRIGHTNESS):source.data[p+i]
  output.data[p+3]=alpha
 }
 return output
}
export function ensureDarkerGrass(){
 const folder=path.join(root,'src/tiled/tiny-swords')
 // Include recipe changes in the cache key; otherwise changing brightness
 // leaves the previously generated grass sheets untouched on local machines.
 const recipeModified=fs.statSync(fileURLToPath(import.meta.url)).mtimeMs
 for(const [input,output] of entries){
  const from=path.join(folder,input),to=path.join(folder,output)
  if(!fs.existsSync(from))throw Error('Grass source tileset missing: '+from)
  if(fs.existsSync(to)&&fs.statSync(to).mtimeMs>=Math.max(fs.statSync(from).mtimeMs,recipeModified))continue
  const raw=PNG.sync.read(fs.readFileSync(from))
  if(raw.width!==576||raw.height!==384)
   throw Error(input+': expected 576x384 Tiled sheet, got '+raw.width+'x'+raw.height)
  const corrected=dimGrassPixels(raw)
  fs.writeFileSync(to,PNG.sync.write(corrected))
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 ensureDarkerGrass()
 console.log('Gras und Waldwiese um 20 % abgedunkelt.')
}
