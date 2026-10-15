import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PNG} from 'pngjs'

// Reuse the SAME Pixel Frog / Tiny Swords native PNG art that supplies all
// woodland trees and villages. Never vector-draw or resize scenery buildings.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
export const ORIGINAL_GREEN_BUILDINGS=Object.freeze({
 'desert-house':{source:'House1.png',width:128,height:192},
 'desert-tent':{source:'House2.png',width:128,height:192},
 'desert-temple':{source:'Monastery.png',width:192,height:320}
})
const clamp=n=>Math.max(0,Math.min(255,Math.round(n)))
export function greenRoofPixels(original){
 const out=new PNG({width:original.width,height:original.height})
 for(let i=0;i<original.data.length;i+=4){
  const r=original.data[i],g=original.data[i+1],b=original.data[i+2],a=original.data[i+3]
  // Recolor only chromatic BLUE ROOF pixels, never ink, masonry, timber,
  // decoration or transparent shadows; cluster geometry remains identical.
  const roof=a>0&&b>72&&b>r*1.16&&b>g*1.045&&(b-r)>26
  if(roof){
   const value=.24*r+.54*g+.22*b
   out.data[i]=clamp(value*.55+8)
   out.data[i+1]=clamp(value*1.13+12)
   out.data[i+2]=clamp(value*.73+7)
  }else{
   out.data[i]=r;out.data[i+1]=g;out.data[i+2]=b
  }
  out.data[i+3]=a
 }
 return out
}
export function renderOriginalGreenBuilding(id){
 const spec=ORIGINAL_GREEN_BUILDINGS[id]
 if(!spec)throw Error('Unknown Tiny Swords building: '+id)
 const file=path.join(root,'public','tiny-swords','Buildings','Blue Buildings',spec.source)
 const source=PNG.sync.read(fs.readFileSync(file))
 if(source.width!==spec.width||source.height!==spec.height)
  throw Error(`Native Pixel Frog art must remain ${spec.width}x${spec.height}: ${id}`)
 return greenRoofPixels(source)
}
