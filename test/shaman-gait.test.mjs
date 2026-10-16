import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PNG} from 'pngjs'
import {copyAuthoredShamanWalk,GAIT_PHASES} from '../scripts/shaman-gait.mjs'
import registry from '../src/art/registry.json' with {type:'json'}

const read=file=>PNG.sync.read(fs.readFileSync(file))
const actual=()=>read('public/'+registry.assets.shaman.animations.walk.image)
const pixel=(p,f,r,x,y)=>Array.from(p.data.subarray(((r*192+y)*p.width+f*192+x)*4,((r*192+y)*p.width+f*192+x)*4+4))
const outline=[24,24,32,255],sole=[32,32,40,255]
// Independently reviewed screen-space toe windows and ground/lift heights.
// These are assertions about visible pixels, not generated phase labels.
const feet=[
 {left:[78,89,124],right:[101,112,132]},
 {left:[82,93,124],right:[97,108,132]},
 {left:[84,92,127],right:[93,103,131]},
 {left:[90,101,132],right:[99,110,124]},
 {left:[86,97,132],right:[102,110,124]},
 {left:[82,92,131],right:[102,112,128]}
]
function inspectFeet(sheet){
 for(let r=0;r<2;r++)for(let f=0;f<6;f++)for(const side of ['left','right']){
  const [lo,hi,bottom]=feet[f][side]
  const hits=y=>Array.from({length:hi-lo+1},(_,i)=>pixel(sheet,f,r,lo+i,y))
  assert.ok(hits(bottom).filter(p=>p.every((v,i)=>v===outline[i])).length>=3,`missing ${side} toe contour ${r}/${f}`)
  assert.ok(hits(bottom-1).filter(p=>p.every((v,i)=>v===sole[i])).length>=3,`missing ${side} sole ${r}/${f}`)
  assert.ok(hits(bottom+1).every(p=>p[3]===0),`foot slides below reviewed contact ${r}/${f}/${side}`)
 }
}

test('real compiled boots alternate contact and lift in both views',()=>inspectFeet(actual()))
test('foot oracle rejects the previous fixed-leading-leg defect',()=>{
 const bad=actual()
 for(let r=0;r<2;r++)for(const f of [3,4,5])
  for(let y=120;y<136;y++)for(let x=72;x<120;x++){
   const from=((r*192+y)*bad.width+x)*4,to=((r*192+y)*bad.width+f*192+x)*4
   bad.data.set(bad.data.subarray(from,from+4),to)
  }
 assert.throws(()=>inspectFeet(bad))
})
test('every painted knee, calf and boot survives composition; no intersecting boots',()=>{
 const {poses,rearPoses,palette,rearPalette}=JSON.parse(fs.readFileSync('art/generated-source/expansion/shaman-run-pixels.json'))
 const sheet=actual()
 for(let r=0;r<2;r++)for(let f=0;f<6;f++){
  const masks={left:new Set(),right:new Set()}
  for(const side of ['left','right']){
   const [ox,oy,lines]=(r?rearPoses:poses)[f][side]
   let visible=0
   for(let y=0;y<lines.length;y++)for(let x=0;x<lines[y].length;x++){
    if(!'dbhso'.includes(lines[y][x]))continue
    const px=ox+x,py=oy+y
    if(py<120)continue
    masks[side].add(py*192+px)
    const expected=[...(r?rearPalette:palette)[lines[y][x]]]
    if(pixel(sheet,f,r,px,py).every((v,i)=>v===expected[i]))visible++
   }
   assert.ok(visible>=masks[side].size*.9,`occluded or disconnected boot ${r}/${f}/${side}`)
   assert.ok(visible>=20,'missing calf/boot')
  }
  assert.ok([...masks.left].every(i=>!masks.right.has(i)),`boots intersect in ${r}/${f}`)
 }
})
test('reviewed physical support sequence and native geometry remain fixed',()=>{
 assert.deepEqual(GAIT_PHASES.map(p=>p.support),['right','right','right','left','left','left'])
 const sheet=actual(),a=registry.assets.shaman
 assert.deepEqual([sheet.width,sheet.height],[1152,384])
 assert.deepEqual(a.foot,[96,132]);assert.deepEqual(a.hitbox,[32,24])
 assert.equal(a.animations.walk.fps,12)
 assert.deepEqual(copyAuthoredShamanWalk(sheet).data,sheet.data)
 assert.throws(()=>copyAuthoredShamanWalk(new PNG({width:192,height:192})))
})

test('six-to-one wrap lands the swinging right foot and releases left support',()=>{
 const sheet=actual()
 for(let r=0;r<2;r++){
  // Toe/sole markers in the real image before and after the wrap.
  assert.deepEqual(pixel(sheet,5,r,107,127),sole)
  assert.deepEqual(pixel(sheet,0,r,107,131),sole)
  assert.deepEqual(pixel(sheet,5,r,87,130),sole)
  assert.deepEqual(pixel(sheet,0,r,82,123),sole)
  // Both half-cycles have the same planted boot shape, on the opposite hip.
  for(let y=125;y<=132;y++)for(let x=101;x<=112;x++)
   assert.deepEqual(pixel(sheet,0,r,x,y),pixel(sheet,3,r,x-11,y))
 }
})

test('each visible sole remains connected through calf and knee to the torso',()=>{
 const sheet=actual()
 for(let r=0;r<2;r++)for(let f=0;f<6;f++){
  const opaque=(x,y)=>pixel(sheet,f,r,x,y)[3]===255
  const seen=new Set(),queue=[]
  for(let x=90;x<=105;x++)if(opaque(x,100)){queue.push([x,100]);seen.add(100*192+x)}
  for(let i=0;i<queue.length;i++){
   const [x,y]=queue[i]
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=x+dx,ny=y+dy,key=ny*192+nx
    if(nx<0||nx>=192||ny<0||ny>=192||seen.has(key)||!opaque(nx,ny))continue
    seen.add(key);queue.push([nx,ny])
   }
  }
  for(const side of ['left','right']){
   const [lo,hi,bottom]=feet[f][side]
   const contacts=[]
   for(let x=lo;x<=hi;x++)if(pixel(sheet,f,r,x,bottom-1).every((v,i)=>v===sole[i]))contacts.push((bottom-1)*192+x)
   assert.ok(contacts.length>=3&&contacts.every(i=>seen.has(i)),`detached ${side} boot ${r}/${f}`)
  }
 }
})
