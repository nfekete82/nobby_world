import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PNG} from 'pngjs'
import {copyAuthoredShamanWalk} from './shaman-gait.mjs'

export const WALK_CADENCE_FPS=12
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const authored=path.join(root,'art/generated-source/expansion/shaman-run.png')
const outputs=['public/tiny-swords/expansion/shaman-walk.png',
 'public/tiny-swords/biomes/shaman-natural-walk.png']

/** Normal prebuild/pretest copies the reviewed native sheet, without transforms. */
export function ensureNaturalShamanWalk(){
 const source=fs.readFileSync(authored)
 const encoded=PNG.sync.write(copyAuthoredShamanWalk(PNG.sync.read(source)))
 for(const relative of outputs){
  const file=path.join(root,relative)
  if(fs.existsSync(file)&&fs.readFileSync(file).equals(encoded))continue
  fs.mkdirSync(path.dirname(file),{recursive:true})
  fs.writeFileSync(file,encoded)
 }
}
