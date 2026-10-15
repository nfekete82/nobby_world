import { isBlocked } from '../navigation/pathfinding.mjs'

export const ARCANE_ACTION='nobby:arcane-bolt'
export const ARCANE_MANA=12
export const ARCANE_RANGE=380
export const ARCANE_COOLDOWN_MS=850
export const ARCANE_SPEED=640
export const ARCANE_STARTUP_MS=150

/** World positions in the same top-left actor coordinate system as Tiled. */
export function distance(a,b){
 return Math.hypot(a.x-b.x,a.y-b.y)
}
/** Sample the footprint-expanded Tiled obstruction grid, not the visual art.
 * Server and client both use it: walls and rivers block magical bolts. */
export function clearShot(nav,from,to){
 if(!nav||![from?.x,from?.y,to?.x,to?.y].every(Number.isFinite))return false
 const total=distance(from,to)
 if(total<1)return true
 for(let d=8;d<total-8;d+=8){
  const t=d/total,x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t
  if(isBlocked(nav,Math.round(x/nav.cell),Math.round(y/nav.cell)))return false
 }
 return true
}
export function canCast({from,to,nav,mana,cooldownReady=true}){
 if(!cooldownReady)return 'cooldown'
 if(!Number.isFinite(mana)||mana<ARCANE_MANA)return 'mana'
 if(!from||!to||!Number.isFinite(from.x)||!Number.isFinite(to.x)||!Number.isFinite(from.y)||!Number.isFinite(to.y))return 'target'
 if(distance(from,to)>ARCANE_RANGE)return 'range'
 if(!clearShot(nav,from,to))return 'blocked'
 return 'ok'
}
/** Hit test against the character artwork, not its small feet collision box.
 * This intentionally ignores houses/NPCs and requires a live monster id. */
export function enemyAt(point,candidates){
 let best=null,bestScore=Infinity
 for(const enemy of candidates){
  if(!enemy||!(enemy.hp>0))continue
  const dx=point.x-enemy.x-16,dy=point.y-enemy.y+19
  if(Math.abs(dx)>43||dy< -54||dy>50)continue
  const score=(dx/43)**2+(dy/55)**2
  if(score<bestScore){best=enemy;bestScore=score}
 }
 return best
}
