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
 const map=player.getCurrentMap?.()
 const id=map?.id??''
 const rules=maps.get(String(id).replace(/^map-/,''))
 const targetId=typeof data?.targetId==='string'?data.targetId:''
 if(!map||!rules?.monsterIds.has(targetId)||!player.hp||player.hp<=0)return false
 const target=resolveMonster(map,targetId)
 if(!target?.battleAi||!Number.isFinite(target.hp)||target.hp<=0)return false
 const now=Date.now(),from=pos(player),to=pos(target)
 if(canCast({from,to,nav:rules.nav,mana:player.sp,
   cooldownReady:now>=(cooldowns.get(player)??0)})!=='ok')return false
 cooldowns.set(player,now+ARCANE_COOLDOWN_MS)
 player.sp-=ARCANE_MANA
 // Existing blue mage casting artwork. Ordinary melee/heal still work.
 void player.setAnimation('heal',1,{durationMs:500})
 const flightMs=ARCANE_STARTUP_MS+Math.round(distance(from,to)/ARCANE_SPEED*1000)
 setTimeout(()=>{
   const current=player.getCurrentMap?.()
   if(current!==map||!player.hp||player.hp<=0)return
   const victim=resolveMonster(current,targetId)
   if(victim!==target||!victim?.battleAi||victim.hp<=0)return
   // The monster may have moved while the projectile flew.
   if(distance(from,pos(victim))>ARCANE_RANGE+48||
      !canCast({from,to:pos(victim),nav:rules.nav,mana:ARCANE_MANA}))return
   // Preserve the native damage/defeat/reward/AI pipeline. The AI's own
   // handleDamage() switches to the attacker; we extend pursuit afterward.
   const result=applyPlayerHitToEvent(player,victim,undefined,{
     damageMultiplier:1.25,knockbackMultiplier:0,source:'arcane-bolt'
   })
   if(result&&result.damage>0){
     provokeAfterHit(victim,player)
   }
 },flightMs)
 return true
}
export { ARCANE_ACTION }
