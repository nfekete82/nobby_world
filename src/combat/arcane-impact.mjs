import { ARCANE_DAMAGE } from './arcane-rules.mjs'

/**
 * Fixed-potency, server-authoritative ranged magic. Unlike melee, arcane
 * projectiles must not inherit the RPG-JS physical weapon formula/multiplier.
 *
 * RPG-JS BattleAi.handleDamage() still owns retaliation, hit feedback,
 * defeat processing and XP/loot. No second damage pass or double rewards.
 */
export function applyArcaneImpact(attacker,victim){
 const hpBefore=Number(victim?.hp)
 if(!Number.isFinite(hpBefore)||hpBefore<=0||!victim?.battleAi)
  return {damage:0,hpBefore,hpAfter:hpBefore}

 const ai=victim.battleAi
 const damage=Math.min(ARCANE_DAMAGE,hpBefore)
 ai.visionRange=Math.max(Number(ai.visionRange)||0,440)
 victim.hp=Math.max(0,hpBefore-damage)
 ai.handleDamage(attacker,{damage,defeated:victim.hp<=0})
 if(victim.hp>0&&ai.getTarget?.()!==attacker){
  ai.onDetectInShape?.(attacker,{id:'arcane-hit'})
 }
 return {damage,hpBefore,hpAfter:Number(victim.hp)}
}
