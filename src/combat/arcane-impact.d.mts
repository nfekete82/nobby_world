/** A fixed-power spell hit, applied on the authoritative RPG-JS server. */
export interface ArcaneImpactResult {
  damage:number
  hpBefore:number
  hpAfter:number
}
export declare function applyArcaneImpact(
  attacker:any,
  victim:{hp:number,battleAi:any}
):ArcaneImpactResult
