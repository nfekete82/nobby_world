/** Server-only impact adapter for the native RPG-JS ActionBattle system. */
export interface ArcaneImpactResult {
  damage:number
  engineDamage:number|null
  hpBefore:number
  hpAfter:number
  engineError:string
}
export declare function applyArcaneImpact(
  attacker:any,
  victim:{hp:number,battleAi:any},
  applyHit:(attacker:any,victim:any,hooks?:any,metadata?:Record<string,unknown>)=>any
):ArcaneImpactResult
