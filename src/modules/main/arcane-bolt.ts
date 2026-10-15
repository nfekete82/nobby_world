import { applyPlayerHitToEvent } from '@rpgjs/action-battle/server'
import worlds from '../../generated/worlds.json'
import { unpackNavigation } from '../../navigation/pathfinding.mjs'
import { ARCANE_ACTION, ARCANE_MANA, ARCANE_COOLDOWN_MS, ARCANE_SPEED,
  ARCANE_STARTUP_MS, canCast, distance } from '../../combat/arcane-rules.mjs'

const maps=new Map(worlds.map(w=>[w.id,{
  monsterIds:new Set(w.objects.filter(o=>o.kind==='monster').map(o=>o.id)),
  nav:unpackNavigation(w.navigation)
}]))
const pos=(entity:any)=>({x:Number(entity.x()),y:Number(entity.y())})
const cooldowns=new WeakMap<object,number>()

/** RPG-JS keeps map events under their runtime keys. The client sends only
 * a whitelisted Tiled object ID, never an arbitrary runtime entity reference.
 * Resolve by that ID or the stable marker attached in monster.onInit(). */
function resolveMonster(map:any,objectId:string):any{
 const direct=map.getEvent?.(objectId)
 if(direct?.battleAi)return direct
 const matches=Object.values(map.events?.()??{}).filter((event:any)=>
   event?.battleAi&&(event as any).nobbyWorldObjectId===objectId)
 return matches.length===1?matches[0]:undefined
}

/** BattleAi's stock target memory is capped at visionRange*1.5. Expand it
 * ONLY for an enemy actually damaged by a ranged spell, not on sight.
 * This preserves peaceful/short-range aggro before combat. */
function provokeAfterHit(victim:any,player:any):void{
 const ai=victim?.battleAi as any
 if(!ai)return
 const original=Number(ai.visionRange)
 ai.visionRange=Math.max(Number.isFinite(original)?original:0,440)
 // The built-in applyPlayerHitToEvent already calls ai.handleDamage()
 // and normally assigns attacker as target. If another AI hook took
 // precedence, explicitly notify this enemy about its attacker.
 if(ai.getTarget?.()!==player)ai.onDetectInShape?.(player,{id:'arcane-hit'})
}

/** Damage, cost and hit eligibility are authoritative. Target coordinates are
 * NEVER accepted from the browser. No arbitrary props/NPCs/player PvP. */
export function castArcaneBolt(player:any,data:any):boolean{
 const targetId=typeof data?.targetId==='string'?data.targetId:''
 const requestId=typeof data?.requestId==='string'&&data.requestId.length<=40?data.requestId:''
 const trace=(stage:string,reason:string,extra:Record<string,unknown>={})=>{
   // Authoritative result is sent to the caster, so the client never draws
   // fake spell hits when the server rejected mana/range/target checks.
   player.nobbyLastSpell={stage,reason,targetId,...extra}
   if(requestId)player.emit('nobby:arcane-status',{
     requestId,targetId,stage,reason,
     ...(stage==='impact'?{damage:extra.damage??0,hpAfter:extra.hpAfter}:{}),
   })
 }
 const map=player.getCurrentMap?.()
 const id=String(map?.id??'').replace(/^map-/,'')
 const rules=maps.get(id)
 if(!map||!rules){trace('rejected','map',{mapId:id});return false}
 if(!rules.monsterIds.has(targetId)){trace('rejected','monster-id',{mapId:id});return false}
 if(!Number.isFinite(player.hp)||player.hp<=0){trace('rejected','player-dead');return false}
 const target=resolveMonster(map,targetId)
 if(!target?.battleAi||!Number.isFinite(target.hp)||target.hp<=0){
   trace('rejected','enemy-missing-or-dead',{mapId:id,available:Object.keys(map.events?.()??{}).length})
   return false
 }
 const now=Date.now(),from=pos(player),to=pos(target)
 const reason=canCast({from,to,nav:rules.nav,mana:player.sp,
   cooldownReady:now>=(cooldowns.get(player)??0)})
 if(reason!=='ok'){
   trace('rejected',reason,{mapId:id,range:Math.round(distance(from,to)),mana:player.sp})
   return false
 }
 cooldowns.set(player,now+ARCANE_COOLDOWN_MS)
 player.sp-=ARCANE_MANA
 trace('accepted','in-flight',{mapId:id,mana:player.sp})
 // Existing blue mage casting artwork. Ordinary melee/heal still work.
 void player.setAnimation('heal',1,{durationMs:500})
 const flightMs=ARCANE_STARTUP_MS+Math.round(distance(from,to)/ARCANE_SPEED*1000)
 setTimeout(()=>{
   const current=player.getCurrentMap?.()
   if(current!==map||!Number.isFinite(player.hp)||player.hp<=0){
     trace('cancelled','player-left-or-dead');return
   }
   const victim=resolveMonster(current,targetId)
   if(victim!==target||!victim?.battleAi||victim.hp<=0){
     trace('cancelled','enemy-left-or-dead');return
   }
   // Monster AI can move during projectile flight. Only discard a shot if
   // it has genuinely escaped the projectile's effective range or line of sight.
   const liveTarget=pos(victim)
   if(distance(from,liveTarget)>ARCANE_RANGE+48||
      !canCast({from,to:liveTarget,nav:rules.nav,mana:ARCANE_MANA})){
     trace('cancelled','flight-occluded-or-out-of-range',{
       range:Math.round(distance(from,liveTarget))})
     return
   }
   // RPG-JS ActionBattle applies authoritative HP, rewards and on-damage AI.
   const oldHp=victim.hp
   const result=applyPlayerHitToEvent(player,victim,undefined,{
     damageMultiplier:1.25,knockbackMultiplier:0,source:'arcane-bolt'
   })
   const actualDamage=Math.max(0,oldHp-victim.hp)
   trace('impact',actualDamage>0?'hit':'zero-damage',{
     damage:actualDamage,engineDamage:result?.damage??null,
     hpBefore:oldHp,hpAfter:victim.hp})
   if(actualDamage>0)provokeAfterHit(victim,player)
 },flightMs)
 return true
}
export { ARCANE_ACTION }
