import {PNG} from 'pngjs'

// The six source walk frames show the same leading boot. Give the
// shaman a genuine two-foot cycle instead of just speeding up the sheet.
// Only ankle / boot pixels change: no edits to face, body, staff or cape.
const CELL=192
const BOOT_TOP=119
const BOOT_LEFT=78
const BOOT_RIGHT=114
const MID=96

export const GAIT_PHASES=Object.freeze([
 Object.freeze({lead:'right',mirror:false,leftLift:1,rightLift:0,leftDx:0,rightDx:1}),
 Object.freeze({lead:'right',mirror:false,leftLift:3,rightLift:0,leftDx:0,rightDx:2}),
 Object.freeze({lead:'passing',mirror:false,leftLift:1,rightLift:1,leftDx:0,rightDx:0}),
 Object.freeze({lead:'left',mirror:true,leftLift:0,rightLift:1,leftDx:-1,rightDx:0}),
 Object.freeze({lead:'left',mirror:true,leftLift:0,rightLift:3,leftDx:-2,rightDx:0}),
 Object.freeze({lead:'passing',mirror:true,leftLift:1,rightLift:1,leftDx:0,rightDx:0})
])

const pixel=(png,x,y)=>((y*png.width+x)*4)

/**
 * After normalising tiny horizontal jitter, change which foot PLANTS.
 * Native six frames, two directional rows, nearest neighbour, binary alpha.
 * On leftward strides, mirror the original boot-only patch across x=96.
 * Left/right ankles can now alternately lift off the ground. The previous
 * six raw poses only animated the robe and arms around a fixed right foot.
 */
export function alternateShamanFeet(aligned){
 if(aligned.width!==CELL*6||aligned.height!==CELL*2)
  throw Error('Expected 6x2 shaman walk sheet with native 192px cells')
 const out=new PNG({width:aligned.width,height:aligned.height})
 out.data.set(aligned.data)
 for(let row=0;row<2;row++)for(let frame=0;frame<6;frame++){
  const pose=GAIT_PHASES[frame],originX=frame*CELL,originY=row*CELL
  // Erase only the ankle/boot region, never the shaman's upper body.
  for(let y=BOOT_TOP;y<=135;y++)for(let x=BOOT_LEFT-3;x<=BOOT_RIGHT+3;x++){
   const dest=pixel(out,originX+x,originY+y)
   out.data.fill(0,dest,dest+4)
  }
  // Draw lifted foot before the planted foot so grounded contact overlaps
  // cleanly where the two boots intersect.
  for(const planted of [false,true]){
   for(let y=BOOT_TOP;y<=132;y++)for(let x=BOOT_LEFT;x<=BOOT_RIGHT;x++){
    const sourceX=pose.mirror?MID*2-x:x
    if(sourceX<BOOT_LEFT||sourceX>BOOT_RIGHT)continue
    const isLeft=x<MID
    const lift=isLeft?pose.leftLift:pose.rightLift
    const dx=isLeft?pose.leftDx:pose.rightDx
    if((lift===0)!==planted)continue
    const si=pixel(aligned,originX+sourceX,originY+y)
    if(aligned.data[si+3]===0)continue
    const px=x+dx,py=y-lift
    if(px<BOOT_LEFT-3||px>BOOT_RIGHT+3||py<BOOT_TOP-3||py>135)continue
    const di=pixel(out,originX+px,originY+py)
    out.data.set(aligned.data.subarray(si,si+4),di)
   }
  }
 }
 return out
}
