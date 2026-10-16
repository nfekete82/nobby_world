import { distance, clearShot } from './arcane-rules.mjs'
import { findRoute } from '../navigation/pathfinding.mjs'

const value=(entity,key)=>typeof entity[key]==='function'?entity[key]():entity[key]
const point=entity=>({x:value(entity,'x'),y:value(entity,'y')})

/** Explicit room membership excludes wildlife, scenery and friendly NPCs.
 * Pathfinding may return only a partial route: check its endpoint as well. */
export function nearestHostile(enemy,players,events,nav,range){
 if(!(enemy.hp>0)||!nav)return null
 const from=point(enemy),playerIds=new Set(players.map(p=>p.id))
 const candidates=[...players,...events].filter(target=>
  target.id!==enemy.id&&target.hp>0&&
  (playerIds.has(target.id)||target.nobbyCompanion===true)&&
  target.battleAi?.getFaction?.()!=='enemies')
  .map(target=>({target,to:point(target)}))
  .map(entry=>({...entry,distance:distance(from,entry.to)}))
  .filter(entry=>Number.isFinite(entry.distance)&&entry.distance<=range)
  .sort((a,b)=>a.distance-b.distance||String(a.target.id).localeCompare(String(b.target.id)))
 for(const {target,to}of candidates){
  if(clearShot(nav,from,to))return target
  const route=findRoute(nav,from,to),end=route.at(-1)
  if(end&&distance(end,to)<=nav.cell*1.5&&clearShot(nav,end,to))return target
 }
 return null
}

/** Only native public BattleAi hooks manage threat, state and attacks.
 * The target permission also prevents distant damage credit from stealing aggro. */
export function refreshEnemyTarget(enemy,players,events,nav,range){
 const ai=enemy.battleAi
 if(!ai||!(enemy.hp>0))return null
 const target=nearestHostile(enemy,players,events,nav,range)
 enemy.nobbyNearestTargetId=target?.id??''
 const previous=ai.getTarget()
 if(previous?.id!==target?.id){
  enemy.stopMoveTo?.()
  if(previous)ai.onDetectOutShape(previous,{id:'nobby-nearest-hostile'})
  if(target)ai.onDetectInShape(target,{id:'nobby-nearest-hostile'})
 }
 return target
}
