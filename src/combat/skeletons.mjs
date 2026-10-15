import { findRoute, isBlocked } from '../navigation/pathfinding.mjs'
import { clearShot, distance } from './arcane-rules.mjs'
import { characterClass, readProp, writeProp } from '../progression/character-class.mjs'

export const SUMMON = Object.freeze({ mana: 10, limit: 3, lifetime: 60000, cooldown: 1800,
 startup: 650, attackCooldown: 1050, attackRange: 58, aggro: 300, leash: 480, repath: 650 })
export const position = e => ({ x: Number(typeof e.x === 'function' ? e.x() : e.x),
 y: Number(typeof e.y === 'function' ? e.y() : e.y) })
export function companionTargetPermission({attacker,target}){
 if(target?.nobbyCompanion)return attacker?.battleAi?.getFaction?.()==='enemies'
 if(attacker?.nobbyCompanion)return target?.battleAi?.getFaction?.()==='enemies'
 return undefined
}

export function hostile(entity, monsterIds) {
 return !!entity?.battleAi && entity.hp > 0 && !entity.nobbyCompanion &&
 monsterIds.has(entity.nobbyWorldObjectId)
}
export function spawnPosition(nav, origin, occupied = []) {
 if (!nav || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) return null
 for (const radius of [48, 64, 80, 96]) for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
  const point = { x: Math.round((origin.x+dx*radius)/nav.cell)*nav.cell,
   y: Math.round((origin.y+dy*radius)/nav.cell)*nav.cell }
  if (isBlocked(nav,point.x/nav.cell,point.y/nav.cell) || occupied.some(e=>distance(point,position(e))<36)) continue
  if (clearShot(nav,origin,point)) return point
 }
 return null
}

/** One owner-scoped controller. The engine adapter owns event creation/physics;
 * this controller owns the transaction, bounded AI, targeting and cleanup. */
export function createSkeletonController(owner, adapter, overrides = {}) {
 const rules = { ...SUMMON, ...overrides }, active = new Map()
 let ready = 0, pending = false, generation = 0
 const status=(stage,reason)=>{adapter.status?.({stage,reason});return false}
 const publish = () => {
  writeProp(owner,'nobbySkeletons',active.size)
  writeProp(owner,'nobbySummonUntil',ready)
 }
 const remove = (id, death = false) => {
  const entry = active.get(id)
  if (!entry) return
  active.delete(id)
  adapter.remove(entry.map,entry.entity,death)
  publish()
 }
 const cleanup = () => {
  generation++
  for (const id of [...active.keys()]) remove(id)
 }
 async function summon(now = Date.now()) {
  const map = adapter.map(), config = adapter.config(map)
  if(pending)return status('rejected','pending')
  if(characterClass(owner)!=='shaman')return status('rejected','class')
  if(!Number.isFinite(owner.hp)||owner.hp<=0||!owner.canMove)return status('rejected','inactive')
  if(!Number.isFinite(owner.sp)||owner.sp<rules.mana)return status('rejected','mana')
  if(now<ready)return status('rejected','cooldown')
  if(active.size>=rules.limit)return status('rejected','limit')
  if(!config)return status('rejected','map')
  const occupied=[...active.values()].map(e=>e.entity).concat(adapter.occupied?.(map)??[])
  const point=spawnPosition(config.nav,position(owner),occupied)
  if (!point) return status('rejected','position')
  pending=true
  const token=generation
  let entity
  try {
   entity=await adapter.spawn(map,point)
   // A portal, load, disconnect or death can happen during async event creation.
   if (!entity || token!==generation || adapter.map()!==map || owner.hp<=0 ||
     characterClass(owner)!=='shaman' || owner.sp<rules.mana) {
    if(entity) adapter.remove(map,entity,false)
    return false
   }
   owner.sp-=rules.mana
   ready=now+rules.cooldown
   active.set(entity.id,{entity,map,expires:now+rules.lifetime,attackAt:now+rules.startup,
    repathAt:0,path:[],target:null,awakeAt:now+rules.startup})
   publish()
   try { adapter.cast(owner,entity) } catch(error) { adapter.error?.(error) }
   status('accepted','summoned')
   return true
  } catch(error) {
   if(entity) adapter.remove(map,entity,false)
   adapter.error?.(error)
   return status('failed','spawn')
  } finally { pending=false }
 }
 function tick(now = Date.now()) {
  if(owner.hp<=0 || !characterClass(owner)) { cleanup(); return }
  for (const [id,entry] of active) {
   const {entity,map}=entry
   if(adapter.map()!==map || entity.hp<=0 || now>=entry.expires || !adapter.exists(map,entity)) {
    remove(id,entity.hp<=0||now>=entry.expires); continue
   }
   if(now<entry.awakeAt) continue
   const config=adapter.config(map)
   if(!config) { remove(id); continue }
   const from=position(entity),home=position(owner)
   // Whitelist authored enemies only: never sheep, players, NPCs or summons.
   const enemies=adapter.enemies(map).filter(e=>hostile(e,config.monsterIds)&&
    distance(position(e),home)<=rules.aggro&&distance(from,position(e))<=rules.leash)
   const target=enemies.sort((a,b)=>distance(from,position(a))-distance(from,position(b)))[0]
   const aim=target?position(target):{x:home.x+[-48,48,0][[...active.keys()].indexOf(id)],y:home.y+48}
   const close=distance(from,aim)<(target?rules.attackRange:24)&&(!target||clearShot(config.nav,from,aim))
   if(close) {
    adapter.stop(entity)
    if(target&&now>=entry.attackAt&&clearShot(config.nav,from,aim)) {
     entry.attackAt=now+rules.attackCooldown
     // Set the cooldown before callbacks: synchronous defeat cannot double hit.
     adapter.attack(entity,target,owner)
    }
    continue
   }
   if(now>=entry.repathAt || entry.target!==target?.id) {
    entry.repathAt=now+rules.repath
    entry.target=target?.id
    entry.path=findRoute(config.nav,from,aim)
   }
   while(entry.path.length&&distance(from,entry.path[0])<10)entry.path.shift()
   if(entry.path.length)adapter.move(entity,entry.path[0])
   else adapter.stop(entity)
  }
 }
 publish()
 return {summon,tick,cleanup,get count(){return active.size},get pending(){return pending}}
}

/** Existing BattleAi owns defeat/rewards. Attribute the single hit to the owner. */
export function skeletonImpact(entity, victim, owner) {
 if(owner.hp<=0 || !victim?.battleAi || victim.hp<=0 || victim.nobbyCompanion) return 0
 const level=Number(readProp(owner,'level')??readProp(owner,'_level'))||1
 const damage=Math.min(victim.hp,Math.max(1,8+level*2-Number(victim.param?.pdef||0)))
 victim.hp-=damage
 victim.battleAi.handleDamage(owner,{damage,defeated:victim.hp<=0})
 return damage
}
