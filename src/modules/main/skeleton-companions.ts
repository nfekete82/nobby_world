import { MAXHP } from '@rpgjs/server'
import { BattleAi, EnemyType } from '@rpgjs/action-battle/server'
import worlds from '../../generated/worlds.json'
import { unpackNavigation } from '../../navigation/pathfinding.mjs'
import { createSkeletonController, skeletonImpact } from '../../combat/skeletons.mjs'

const configs=new Map(worlds.map(w=>[w.id,{nav:unpackNavigation(w.navigation),
 monsterIds:new Set(w.objects.filter(o=>o.kind==='monster').map(o=>o.id))}]))
// RPG-JS passes both raw entities and reactive proxies into hooks. Runtime
// identity is the player ID, not JavaScript object identity.
const controllers=new Map<string,{mapId:string,controller:ReturnType<typeof createSkeletonController>}>()
function animate(entity:any,name:string){
 try { void Promise.resolve(entity.setGraphicAnimation(name,1))
  .catch(error=>console.warn('[Nobby companion animation]',error)) }
 catch(error){ console.warn('[Nobby companion animation]',error) }
}
export function companions(player:any){
 player=player.getCurrentMap()?.getPlayer?.(player.id)??player
 const mapId=String(player.getCurrentMap()?.id??'')
 const previous=controllers.get(player.id)
 if(previous?.mapId===mapId)return previous.controller
 previous?.controller.cleanup()
 const controller=createSkeletonController(player,{
  map:()=>player.getCurrentMap(),
  config:(map:any)=>configs.get(String(map?.id??'').replace(/^map-/,'')),
  enemies:(map:any)=>Object.values(map.events()),
  exists:(map:any,entity:any)=>map.events()[entity.id]===entity,
  async spawn(map:any,point:any){
   const id=await map.createDynamicEvent({x:point.x,y:point.y,event:{
    name:'Nobbys Skelett',pushable:false,mass:100,
    onInit(){
     const self=this as any
     self.nobbyCompanion=true
     self.setGraphic('skeleton')
     self.setHitbox(32,24)
     self.setParameter(MAXHP,40+player.level*5)
     self.allRecovery()
     self.speed=4;self.pushable=false;self.setMass(100)
     // Companion bodies never trap their owner or other allies. Navigation
     // checks still exclude walls, water, solid scenery and corner cutting.
     self.through=false;self.throughOtherPlayer=true
     new BattleAi(self,{
      enemyType:EnemyType.Defensive,faction:'players',targets:()=>false,
      visionRange:1,dodgeChance:0,fleeThreshold:0,attackPatterns:[],
      rewards:{exp:0,gold:0},animations:{attack:'attack',hurt:'hit',die:'death'},
      presentation:{name:'Nobbys Skelett',healthBar:{style:{width:36,height:4}}}
     })
    }
   }})
   return id?map.getEvent(id):undefined
  },
  remove(map:any,entity:any,death:boolean){
   entity.stopMoveTo?.()
   entity.battleAi?.destroy()
   entity.canMove=false
   if(death)entity.remove({reason:'expired',transition:{animation:'death',graphic:'skeleton',duration:450},timeoutMs:450})
   else map.removeEvent(entity.id)
  },
  cast(owner:any,entity:any){
   animate(owner,'heal')
   animate(entity,'spawn')
  },
  stop:(entity:any)=>entity.stopMoveTo(),
  move:(entity:any,point:any)=>entity.moveTo(point),
  attack(entity:any,target:any,owner:any){
   animate(entity,'attack')
   skeletonImpact(entity,target,owner)
  },
  error:(error:any)=>console.error('[Nobby summon]',error),
  status:(result:any)=>{
   player.nobbyLastSummon=result
   player.emit('nobby:summon-status',result)
   if(result.reason==='position')player.showNotification('Kein freier Beschwörungsplatz in deiner Nähe.')
  }
 })
 controllers.set(player.id,{mapId,controller})
 return controller
}
export function cleanupCompanions(player:any,dispose=false){
 const entry=controllers.get(player.id),mapId=String(player.getCurrentMap()?.id??'')
 if(entry&&mapId&&entry.mapId!==mapId)return
 entry?.controller.cleanup()
 if(dispose)controllers.delete(player.id)
}
