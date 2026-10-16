import worlds from '../../generated/worlds.json'
import { unpackNavigation } from '../../navigation/pathfinding.mjs'
import { refreshEnemyTarget } from '../../combat/nearest-hostile.mjs'

const navigation=new Map(worlds.map(world=>[world.id,unpackNavigation(world.navigation)]))
const steps=new WeakMap<object,number>()
const rangeOf=(enemy:any)=>Math.max(enemy.nobbyAggroRange,Number(enemy.battleAi.visionRange)||0)
export function refreshEnemyTargetNow(enemy:any){
 const room=enemy.getCurrentMap()
 if(!room)return
 const nav=navigation.get(String(room.id).replace(/^map-/,''))
 return refreshEnemyTarget(enemy,Object.values(room.players()),Object.values(room.events()),nav,rangeOf(enemy))
}
export function stepEnemyTargets(room:any,now=Date.now()){
 if(!room||now-(steps.get(room)??-Infinity)<250)return
 steps.set(room,now)
 const nav=navigation.get(String(room.id).replace(/^map-/,''))
 const players=Object.values(room.players()),events=Object.values(room.events())
 for(const enemy of events as any[]){
  if(enemy.battleAi?.getFaction()==='enemies'&&enemy.nobbyAggroRange!==undefined)
   refreshEnemyTarget(enemy,players,events,nav,rangeOf(enemy))
 }
}
