// Rebuild the hand-painted native pixel source. No pose is mirrored, stretched,
// cropped from an old boot or generated from a limb transform.
import fs from 'node:fs'
import {PNG} from 'pngjs'
const base='art/generated-source/expansion/'
const {palette,rearPalette,poses,rearPoses}=JSON.parse(fs.readFileSync(base+'shaman-run-pixels.json','utf8'))
const upper=PNG.sync.read(fs.readFileSync(base+'shaman-run-upper.png'))
const out=new PNG({width:1152,height:384})
for(let row=0;row<2;row++)for(let frame=0;frame<6;frame++){
 // Rear has separately painted rounded heels and darker leather highlights.
 // Persistent left/right legs follow the same physical cycle in both views.
 const order=frame<3?['left','right']:['right','left']
 for(const side of order){
  const [ox,oy,lines]=(row?rearPoses:poses)[frame][side]
  for(let y=0;y<lines.length;y++)for(let x=0;x<lines[y].length;x++){
   const color=(row?rearPalette:palette)[lines[y][x]];if(!color)continue
   const i=((row*192+oy+y)*out.width+frame*192+ox+x)*4
   const rgba=[...color]
   out.data.set(rgba,i)
  }
 }
 // Existing identity pixels occlude the thighs. No waist seam or detached knee.
 for(let y=0;y<192;y++)for(let x=0;x<192;x++){
  const i=((row*192+y)*out.width+frame*192+x)*4
  if(upper.data[i+3])out.data.set(upper.data.subarray(i,i+4),i)
 }
}
fs.writeFileSync(base+'shaman-run.png',PNG.sync.write(out))
