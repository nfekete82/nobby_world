import {test} from 'node:test'
import assert from 'node:assert/strict'
import {nearestHostile,refreshEnemyTarget} from '../src/combat/nearest-hostile.mjs'
import {companionTargetPermission,skeletonImpact} from '../src/combat/skeletons.mjs'
const entity=(id,x,y,extra={})=>({id,x:()=>x,y:()=>y,hp:100,...extra})
const grid=()=>({cell:16,cols:30,rows:30,bits:new Uint8Array(Math.ceil(900/8))})
const bone=(id,x,y)=>entity(id,x,y,{nobbyCompanion:true,battleAi:{getFaction:()=> 'players'}})
const blocked=(nav,x,y)=>{const i=y*nav.cols+x;nav.bits[i>>3]|=1<<(i&7)}
test('hostile selects nearest living player or skeleton, never neutral animals or another enemy',()=>{
 const foe=entity('foe',160,160),p=entity('player',240,160),s=bone('skeleton',192,160)
 const events=[s,entity('sheep',161,160),entity('mira',162,160),entity('snake',163,160),entity('enemy',164,160,{battleAi:{getFaction:()=> 'enemies'}})]
 assert.equal(nearestHostile(foe,[p],events,grid(),300),s)
 assert.equal(nearestHostile(foe,[entity('closer',176,160)],events,grid(),300).id,'closer')
 s.hp=0;assert.equal(nearestHostile(foe,[p],events,grid(),300),p)
 p.hp=0;assert.equal(nearestHostile(foe,[p],events,grid(),300),null)
})
test('range, invalid coordinates, missing navigation and room removal clear eligibility',()=>{
 const foe=entity('foe',160,160),s=bone('s',192,160)
 assert.equal(nearestHostile(foe,[],[s],grid(),20),null)
 assert.equal(nearestHostile(foe,[],[s],undefined,300),null)
 assert.equal(nearestHostile(foe,[],[bone('bad',NaN,160)],grid(),300),null)
 assert.equal(nearestHostile(foe,[],[],grid(),300),null)
})
test('unreachable nearer target across a sealed wall loses to reachable farther player',()=>{
 const nav=grid();for(let y=0;y<nav.rows;y++)blocked(nav,12,y)
 const foe=entity('foe',160,160),s=bone('s',208,160),p=entity('p',160,240)
 assert.equal(nearestHostile(foe,[p],[s],nav,300),p)
 assert.equal(nearestHostile(foe,[],[s],nav,300),null)
 // An actual opening permits a routed approach even without line of sight.
 const i=8*nav.cols+12;nav.bits[i>>3]&=~(1<<(i&7))
 assert.equal(nearestHostile(foe,[],[s],nav,300),s)
})
test('native retarget hooks run only on a change and clear stale/dead targets',()=>{
 let current=null;const calls=[]
 const foe=entity('foe',160,160,{stopMoveTo:()=>calls.push('stop'),battleAi:{getTarget:()=>current,
  onDetectOutShape:()=>{current=null;calls.push('out')},onDetectInShape:t=>{current=t;calls.push(t.id)}}})
 const p=entity('p',240,160),s=bone('s',192,160),nav=grid()
 refreshEnemyTarget(foe,[p],[s],nav,300)
 refreshEnemyTarget(foe,[p],[s],nav,300)
 assert.deepEqual(calls,['stop','s']);assert.equal(foe.nobbyNearestTargetId,'s')
 s.hp=0;refreshEnemyTarget(foe,[p],[s],nav,300)
 assert.equal(current,p)
 refreshEnemyTarget(foe,[],[],nav,300)
 assert.equal(current,null);assert.equal(foe.nobbyNearestTargetId,'')
})
test('skeleton damage credits owner once while permission retains the closest skeleton as threat',()=>{
 const p=entity('owner',240,160,{level:1}),s=bone('skeleton',192,160);let credit=0
 const foe=entity('foe',160,160,{nobbyNearestTargetId:s.id,battleAi:{getFaction:()=> 'enemies',handleDamage:(owner,result)=>{
  assert.equal(owner,p);assert.equal(result.damage,10);credit++
  assert.equal(companionTargetPermission({attacker:foe,target:owner}),false)
 }}})
 assert.equal(skeletonImpact(s,foe,p),10);assert.equal(credit,1)
 assert.equal(companionTargetPermission({attacker:foe,target:s}),true)
 assert.equal(companionTargetPermission({attacker:foe,target:bone('other',170,160)}),false)
 foe.nobbyNearestTargetId=p.id
 assert.equal(companionTargetPermission({attacker:foe,target:p}),true)
 assert.equal(companionTargetPermission({attacker:foe,target:s}),false)
})
test('arcane hit preserves immediate extended-range mage retaliation without stealing closer skeleton aggro',async()=>{
 const {applyArcaneImpact}=await import('../src/combat/arcane-impact.mjs')
 const p=entity('mage',416,160),s=bone('skeleton',192,160),nav=grid();let events=[],current=null,hits=0
 const foe=entity('foe',160,160,{nobbyNearestTargetId:''})
 foe.battleAi={visionRange:100,getFaction:()=> 'enemies',getTarget:()=>current,
  onDetectOutShape:()=>{current=null},
  onDetectInShape:t=>{if(companionTargetPermission({attacker:foe,target:t}))current=t},
  handleDamage:attacker=>{hits++;if(companionTargetPermission({attacker:foe,target:attacker}))current=attacker}}
 foe.nobbyRefreshTarget=()=>refreshEnemyTarget(foe,[p],events,nav,foe.battleAi.visionRange)
 applyArcaneImpact(p,foe)
 assert.equal(current,p);assert.equal(foe.battleAi.visionRange,440)
 events=[s];applyArcaneImpact(p,foe)
 assert.equal(current,s);assert.equal(hits,2);assert.equal(foe.hp,80)
})
