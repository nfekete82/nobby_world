import { Move, type EventDefinition } from '@rpgjs/server'
import { ART } from '../../art/sprites'
import { unpackNavigation } from '../../navigation/pathfinding.mjs'
import { unpackPasture, seedSheep, sheepStep } from '../../wildlife/sheep-ai.mjs'

/** Shared server-owned wildlife; no per-sheep interval or teleport.
 * Native RPGJS move routes stop with their parent map events. */
export function sheepEvent(object:any, world:any):EventDefinition{
 const pasture=unpackPasture(world?.pasture)
 const nav=world?.navigation?unpackNavigation(world.navigation):null
 return {
  name:object.name,
  pushable:false,
  mass:100,
  onInit(){
   const sheep=this as any
   sheep.setGraphic('sheep')
   sheep.setHitbox(...ART.assets.sheep.hitbox as [number,number])
   sheep.through=true // Players can pass through sheep; never trap the hero.
   sheep.pushable=false
   sheep.setMass(100)
   sheep.canMove=true
   sheep.speed=1.2
   if(!pasture)return
   let seed=seedSheep(world.id+':'+object.id),step=0
   const directions={
    left:()=>Move.tileLeft(),right:()=>Move.tileRight(),
    up:()=>Move.tileUp(),down:()=>Move.tileDown()
   }
   sheep.infiniteMoveRoute([(animal:any)=>{
    const position={
     x:typeof animal.x==='function'?Number(animal.x()):Number(animal.position?.x??object.x),
     y:typeof animal.y==='function'?Number(animal.y()):Number(animal.position?.y??object.y)
    }
    const action=sheepStep({
     mask:pasture,nav,home:{x:object.x,y:object.y},position,seed,step:step++
    })
    seed=action.seed
    if(action.kind==='walk')return directions[action.direction as keyof typeof directions]()(animal,animal.getCurrentMap())
    // The grazing animation takes place while the engine's route is waiting.
    // Any overlapping animation is transient and reverts to idle afterward.
    if(typeof animal.setGraphicAnimation==='function')
     {
      const animation=animal.setGraphicAnimation('graze',1)
      if(animation&&typeof animation.catch==='function')void animation.catch(()=>{})
     }
    return Move.wait(action.duration)
   }])
  }
 }
}
