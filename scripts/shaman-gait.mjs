import {PNG} from 'pngjs'

// Phase labels describe persistent leg identities, not independent mirrored
// patches. The native pixel drawings live in shaman-run-pixels.json; tests
// inspect their visible boots in the real compiled PNG as well as the source.
export const GAIT_PHASES=Object.freeze([
 {lead:'right',support:'right'},
 {lead:'right',support:'right'},
 {lead:'passing',support:'right'},
 {lead:'left',support:'left'},
 {lead:'left',support:'left'},
 {lead:'passing',support:'left'}
].map(Object.freeze))

/** Copy the authored full poses exactly. Runtime/build never reposition limbs. */
export function copyAuthoredShamanWalk(source){
 if(source.width!==1152||source.height!==384)
  throw Error('Expected an authored 1152×384 shaman walk sheet')
 const out=new PNG({width:1152,height:384})
 out.data.set(source.data)
 for(let i=3;i<out.data.length;i+=4)
  if(out.data[i]!==0&&out.data[i]!==255)throw Error('Shaman walk must have pixel-hard alpha')
 return out
}
