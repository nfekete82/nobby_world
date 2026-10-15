import {Move,type EventDefinition} from '@rpgjs/server'
import {unpackNavigation} from '../../navigation/pathfinding.mjs'
import {snakeStep} from '../../wildlife/desert-snake.mjs'
export function desertSnakeEvent(object:any,world:any):EventDefinition{
 const nav=unpackNavigation(world.navigation)
 return {name:object.name,pushable:false,mass:100,onInit(){
  const self=this as any
  self.setGraphic('desert-snake');self.setHitbox(32,20)
  self.through=true;self.pushable=false;self.setMass(100);self.speed=1.2
  let step=Number(String(object.id).replace(/\D/g,''))||0
  const moves={left:()=>Move.tileLeft(),right:()=>Move.tileRight(),up:()=>Move.tileUp(),down:()=>Move.tileDown()}
  self.infiniteMoveRoute([(animal:any)=>{
   const direction=snakeStep(nav,object,{x:animal.x(),y:animal.y()},step++)
   return direction?moves[direction]()(animal,animal.getCurrentMap()):Move.wait(2)
  }])
 }}
}
