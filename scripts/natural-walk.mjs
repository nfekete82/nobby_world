import { PNG } from 'pngjs'

/**
 * Calm six-frame two-direction walk from the authored 192px Nobby shaman art.
 * Keep the character's upper body, man bun, face, and staff from one idle pose,
 * but preserve the already-authored alternating legs from the walking sheet.
 * Both compiled sheets already have identical [96,132] anchors.
 */
export function stabilizeShamanWalk(standing,walking) {
 const frames=6,cell=192,rows=2
 if(standing.width!==cell*frames||walking.width!==cell*frames||
    standing.height!==cell*rows||walking.height!==cell*rows)
   throw Error('Shaman walk requires two 6×192px directional sheets')
 const result=new PNG({width:walking.width,height:walking.height})
 for(let row=0;row<rows;row++)for(let n=0;n<frames;n++)
  for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
   // Torso stays calm; only cloak hem and left/right feet articulate.
   // Keep the staff/hands untouched at the character's outer edges.
   const inStride=x>=75&&x<=117&&y>=(x>=82&&x<=111?116:121)
   const source=inStride?walking:standing
   const sx=inStride?n*cell+x:x
   const at=((row*cell+y)*source.width+sx)*4
   const dst=((row*cell+y)*result.width+n*cell+x)*4
   result.data.set(source.data.subarray(at,at+4),dst)
  }
 return result
}
