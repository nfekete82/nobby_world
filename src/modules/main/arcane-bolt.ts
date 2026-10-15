import { applyArcaneImpact } from '../../combat/arcane-impact.mjs'
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

 // Register the authoritative projectile BEFORE attempting a visual animation.
 // An animation failure must never suppress the game's damage callback.
 const flightMs=ARCANE_STARTUP_MS+Math.round(distance(from,to)/ARCANE_SPEED*1000)
 const resolveImpact=()=>{
  try {
   const current=player.getCurrentMap?.()
   if(current!==map||!Number.isFinite(player.hp)||player.hp<=0){
    trace('cancelled','player-left-or-dead')
    return
   }
   const victim=resolveMonster(current,targetId)
   if(victim!==target||!victim?.battleAi||victim.hp<=0){
    trace('cancelled','enemy-left-or-dead')
    return
   }
   // Once the server accepts a homing bolt, subsequent NPC movement must
   // not invalidate a fair shot. Map changes and dead targets still cancel.
   // Only the cast's original line of sight and range are authoritative.
   const impact=applyArcaneImpact(player,victim)
   const {damage:actualDamage,hpBefore:originalHp}=impact
   trace('impact',actualDamage>0?'hit':'zero-damage',{
    damage:actualDamage,
    hpBefore:originalHp,hpAfter:victim.hp,
    aggro:victim.battleAi?.getTarget?.()?.id??null
   })
  }catch(error){
   const reason=error instanceof Error?error.message:String(error)
   console.error('[Nobby arcane] projectile impact failed',error)
   trace('failed','impact-exception',{error:reason})
  }
 }
 const timer=setTimeout(resolveImpact,flightMs)
 trace('accepted','in-flight',{mapId:id,mana:player.sp,flightMs,timerScheduled:timer!==undefined})
 try {
  // One-shot blue mage casting animation. Only visual; not part of damage.
  player.setGraphicAnimation('heal',1)
 }catch(error){
  console.warn('[Nobby arcane] casting animation unavailable',error)
 }
 return true
}
export { ARCANE_ACTION }
