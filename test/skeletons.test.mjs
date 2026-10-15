import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createSkeletonController,spawnPosition,hostile,skeletonImpact,SUMMON,companionTargetPermission} from '../src/combat/skeletons.mjs'
import {selectClass,restoreClass} from '../src/progression/character-class.mjs'
const signal=v=>{const f=()=>v;f.set=n=>{v=n};return f}
test('native combat target filter permits enemy retaliation and prevents player/ally friendly fire',()=>{
 const ally={nobbyCompanion:true,battleAi:{getFaction:()=> 'players'}}
 const enemy={battleAi:{getFaction:()=> 'enemies'}}
 assert.equal(companionTargetPermission({attacker:{},target:ally}),false)
 assert.equal(companionTargetPermission({attacker:ally,target:ally}),false)
 assert.equal(companionTargetPermission({attacker:enemy,target:ally}),true)
 assert.equal(companionTargetPermission({attacker:ally,target:enemy}),true)
 assert.equal(companionTargetPermission({attacker:ally,target:{}}),false)
 assert.equal(companionTargetPermission({attacker:{},target:enemy}),undefined)
})
function fixture(options={}){
 const owner={id:'owner',hp:100,sp:100,level:1,canMove:true,x:()=>160,y:()=>160,
  nobbyClass:signal('shaman'),nobbySkeletons:signal(0),nobbySummonUntil:signal(0),setGraphic(){}}
 const nav={cell:16,cols:40,rows:40,bits:new Uint8Array(200)}
 let map={id:'map'},count=0
 const entities=[],moves=[],hits=[],removed=[]
 const adapter={map:()=>map,config:()=>({nav,monsterIds:new Set(['foe'])}),enemies:()=>entities,
  exists:(_m,e)=>entities.includes(e),
  async spawn(_m,p){const e={id:String(++count),hp:45,x:()=>p.x,y:()=>p.y,nobbyCompanion:true};entities.push(e);return e},
  cast(){},remove(_m,e){removed.push(e);entities.splice(entities.indexOf(e),1)},
  stop(){},move(e,p){moves.push(p)},attack(e,t,o){hits.push(t);skeletonImpact(e,t,o)}}
 const control=createSkeletonController(owner,adapter,options)
 return {owner,nav,adapter,control,entities,moves,hits,removed,leave(){map={id:'other'}}}
}
test('first selection is validated, immutable and legacy migration preserves progression',()=>{
 const p={nobbyClass:signal(''),level:12,exp:5000,sp:73,setGraphic(g){this.graphic=g}}
 assert.equal(selectClass(p,'admin'),false)
 assert.equal(selectClass(p,['shaman']),false)
 assert.equal(selectClass(p,{toString:()=> 'shaman'}),false)
 assert.equal(selectClass(p,'shaman'),true)
 assert.equal(p.graphic,'shaman');assert.equal(p.canMove,true)
 assert.equal(selectClass(p,'mage'),false)
 restoreClass(p,{level:12,exp:5000})
 assert.equal(p.nobbyClass(),'mage');assert.equal(p.level,12);assert.equal(p.exp,5000);assert.equal(p.sp,73)
 restoreClass(p,{nobbyClass:'shaman'});assert.equal(p.graphic,'shaman')
})
test('successful summon costs exactly 10 and observes cooldown and three-skeleton limit',async()=>{
 const {control,owner}=fixture()
 assert.equal(await control.summon(1000),true);assert.equal(owner.sp,90)
 assert.equal(await control.summon(1001),false);assert.equal(owner.sp,90)
 assert.equal(await control.summon(2800),true);assert.equal(await control.summon(4600),true)
 assert.equal(control.count,3);assert.equal(owner.nobbySkeletons(),3);assert.equal(owner.sp,70)
 assert.equal(await control.summon(6400),false);assert.equal(owner.sp,70)
})
test('class, death, insufficient mana, locked movement and blocked positions never charge',async()=>{
 for(const mutate of [f=>f.owner.nobbyClass.set('mage'),f=>f.owner.hp=0,f=>f.owner.sp=9,
  f=>f.owner.canMove=false,f=>f.nav.bits.fill(255),f=>f.adapter.config=()=>null]){
  const f=fixture();mutate(f);const before=f.owner.sp
  assert.equal(await f.control.summon(1000),false);assert.equal(f.owner.sp,before)
 }
})
test('spawn failure and map change during asynchronous creation roll back without mana charge',async()=>{
 for(const fail of ['throw','missing','leave','disconnect']){
  const f=fixture(),original=f.adapter.spawn
  f.adapter.spawn=async(...args)=>{
   if(fail==='throw')throw Error('creation failed')
   if(fail==='missing')return null
   const e=await original(...args)
   if(fail==='leave')f.leave();else f.control.cleanup()
   return e
  }
  assert.equal(await f.control.summon(1000),false);assert.equal(f.owner.sp,100)
  assert.equal(f.control.count,0);assert.equal(f.entities.length,0)
 }
})
test('concurrent requests create only one event and spend only 10 mana',async()=>{
 const f=fixture()
 const result=await Promise.all(Array.from({length:20},()=>f.control.summon(1000)))
 assert.equal(result.filter(Boolean).length,1);assert.equal(f.owner.sp,90)
})
test('AI follows on existing navigation, selects only authored hostile monsters and attacks once per cooldown',async()=>{
 const f=fixture();await f.control.summon(1000)
 f.control.tick(1800);assert.ok(f.moves.length)
 const ally=f.entities[0],p={x:ally.x(),y:ally.y()}
 let rewards=0
 const foe={id:'enemy',nobbyWorldObjectId:'foe',hp:25,x:()=>p.x+20,y:()=>p.y,
  battleAi:{handleDamage(_owner,result){if(result.defeated)rewards++}}}
 f.entities.push({id:'sheep',hp:100,x:()=>p.x,y:()=>p.y},
  {id:'npc',hp:100,battleAi:{},x:()=>p.x,y:()=>p.y},foe)
 f.control.tick(2000);assert.equal(f.hits.length,1)
 f.control.tick(2100);assert.equal(f.hits.length,1)
 f.control.tick(3200);f.control.tick(4400);f.control.tick(5600)
 assert.equal(foe.hp,0);assert.equal(rewards,1)
 assert.ok(f.hits.every(t=>t===foe));assert.equal(skeletonImpact(ally,foe,f.owner),0)
})
test('hostile eligibility rejects players, neutral wildlife, companions, dead enemies and forged IDs',()=>{
 const ids=new Set(['foe'])
 for(const e of [{hp:1},{hp:0,battleAi:{},nobbyWorldObjectId:'foe'},
  {hp:5,battleAi:{},nobbyWorldObjectId:'forged'},
  {hp:5,battleAi:{},nobbyWorldObjectId:'foe',nobbyCompanion:true}])assert.equal(hostile(e,ids),false)
})
test('owner death, map transfer, timeout, companion death and disconnect clean up exactly once',async()=>{
 for(const reason of ['owner','portal','timeout','dead','logout','missing']){
  const f=fixture();await f.control.summon(1000)
  if(reason==='owner')f.owner.hp=0
  if(reason==='portal')f.leave()
  if(reason==='dead')f.entities[0].hp=0
  if(reason==='logout')f.control.cleanup()
  if(reason==='missing')f.adapter.exists=()=>false
  f.control.tick(reason==='timeout'?1000+SUMMON.lifetime:2000)
  f.control.cleanup();assert.equal(f.control.count,0);assert.equal(f.removed.length,1)
 }
})
test('navigation rejects water and enclosed spawn positions; attack cannot pass a wall',async()=>{
 const f=fixture();f.nav.bits.fill(255)
 assert.equal(spawnPosition(f.nav,{x:160,y:160}),null)
 f.nav.bits.fill(0);await f.control.summon(1000)
 const ally=f.entities[0],x=ally.x(),y=ally.y()
 const foe={id:'enemy',nobbyWorldObjectId:'foe',hp:100,battleAi:{},x:()=>x+48,y:()=>y}
 f.entities.push(foe)
 const index=Math.round(y/16)*f.nav.cols+Math.round((x+16)/16)
 f.nav.bits[index>>3]|=1<<(index&7)
 f.control.tick(2000);assert.equal(f.hits.length,0)
})
