import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {PNG} from 'pngjs'
import {ensureNaturalShamanWalk,WALK_CADENCE_FPS} from '../scripts/natural-walk.mjs'
import registry from '../src/art/registry.json' with {type:'json'}

const read=file=>PNG.sync.read(fs.readFileSync(file))
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex')

test('the Monk run is a four-pose source for both shaman directions',()=>{
 assert.equal(registry.generation.shaman.walkSource,'public/tiny-swords/Units/Blue Units/Monk/Run.png')
 const native=read(registry.generation.shaman.walkSource)
 assert.equal(native.width,768)
 const walk=registry.assets.shaman.animations.walk
 assert.equal(walk.fps,WALK_CADENCE_FPS)
 assert.equal(walk.frames,4)
 const out=read('public/'+walk.image)
 assert.deepEqual([out.width,out.height],[768,384])
 for(const row of [0,1]){
  const signatures=[]
  for(let frame=0;frame<4;frame++){
   let bottom=-1,visible=0
   const pose=[]
   for(let y=0;y<192;y++)for(let x=0;x<192;x++){
    const alpha=out.data[((row*192+y)*out.width+frame*192+x)*4+3]
    if(alpha){visible++;bottom=Math.max(bottom,y)}
    if(y>=118&&y<=135&&x>=76&&x<=120)pose.push(alpha?1:0)
   }
   assert.ok(visible>150,'empty walk '+row+'/'+frame)
   assert.ok(bottom>=126&&bottom<=138,'unexpected feet '+row+'/'+frame+' y='+bottom)
   signatures.push(pose.join(''))
  }
  assert.ok(new Set(signatures).size>=3,'feet fail to alternate on row '+row)
 }
})

test('rebuild keeps the original Tiny Swords Monk assets untouched and is byte-reproducible',()=>{
 const monk=['Idle.png','Run.png','Heal.png'].map(x=>'public/tiny-swords/Units/Blue Units/Monk/'+x)
 const original=monk.map(hash)
 const image='public/'+registry.assets.shaman.animations.walk.image
 const before=fs.readFileSync(image)
 ensureNaturalShamanWalk()
 assert.deepEqual(monk.map(hash),original)
 assert.deepEqual(fs.readFileSync(image),before,'first regenerated walk differs')
 ensureNaturalShamanWalk()
 assert.deepEqual(fs.readFileSync(image),before,'second regenerated walk differs')
})
