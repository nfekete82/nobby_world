import {PNG} from 'pngjs'

// The four physical phases come from the original Monk Run.png.
// No leg-only correction or generated leg patch is used.
export const GAIT_PHASES=Object.freeze([
 {lead:'right',support:'right'}, {lead:'passing',support:'right'},
 {lead:'left',support:'left'}, {lead:'passing',support:'left'}
].map(Object.freeze))

/** Copy the authored full poses exactly. Runtime/build never reposition limbs. */
export function copyAuthoredShamanWalk(source){
 if(source.width!==768||source.height!==384)
  throw Error('Expected an authored 768×384 shaman walk sheet')
 const out=new PNG({width:768,height:384})
 out.data.set(source.data)
 for(let i=3;i<out.data.length;i+=4)
  if(out.data[i]!==0&&out.data[i]!==255)throw Error('Shaman walk must have pixel-hard alpha')
 return out
}
