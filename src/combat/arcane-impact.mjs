/**
 * Purely server-side application of a previously validated spell hit.
 * "applyHit" is the RPG-JS ActionBattle entry point in production; injecting
 * it makes delayed hits, exceptional damage formulae and aggro testable.
 */
export function applyArcaneImpact(attacker,victim,applyHit){
 const hpBefore=Number(victim.hp)
 if(!Number.isFinite(hpBefore)||hpBefore<=0||!victim.battleAi)
  return {damage:0,engineDamage:null,hpBefore,hpAfter:hpBefore,engineError:''}
 const ai=victim.battleAi
 // Pursuit must outlive the initial close-range vision radius after damage.
 ai.visionRange=Math.max(Number(ai.visionRange)||0,440)
 let result=null,engineError=''
 try{
  result=applyHit(attacker,victim,undefined,{
   damageMultiplier:1.25,knockbackMultiplier:0,source:'arcane-bolt'
  })
 }catch(error){
  engineError=error instanceof Error?error.message:String(error)
  console.error('[Nobby arcane] ActionBattle damage error',error)
 }
 let damage=Math.max(0,hpBefore-Number(victim.hp))
 if(!Number.isFinite(damage))damage=0
 // A magical projectile has an independent base potency even when a
 // physical-weapon formula resolves to 0. Do not give bonus damage when
 // ActionBattle has already applied positive damage.
 if(damage===0&&victim.hp>0){
  const amount=Math.min(hpBefore,18)
  victim.hp=Math.max(0,hpBefore-amount)
  damage=Math.max(0,hpBefore-Number(victim.hp))
  if(damage>0)ai.handleDamage?.(attacker,{
   damage,defeated:victim.hp<=0
  })
 }
 if(damage>0&&victim.hp>0&&ai.getTarget?.()!==attacker)
  ai.onDetectInShape?.(attacker,{id:'arcane-hit'})
 return {
  damage,engineDamage:result?.damage??null,
  hpBefore,hpAfter:Number(victim.hp),engineError
 }
}
