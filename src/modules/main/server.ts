import { defineModule } from "@rpgjs/common";
import { RpgServer } from "@rpgjs/server";
import { player, stepPlayers } from './player'
import { worldEvent } from "./world-events";
import worlds from '../../generated/worlds.json';
import {spawnPosition} from '../../combat/skeletons.mjs'
import {unpackNavigation} from '../../navigation/pathfinding.mjs'

function biomeGateway(world:any){
 if(world.id!=='simplemap')return []
 const point=spawnPosition(unpackNavigation(world.navigation),world.start,world.objects)
 if(!point)return []
 return [{id:'nobby-biome-gateway',...point,event:{name:'Weltenreisestein',onInit(){
  this.setGraphic(['portal-stone','portal-marker']);this.setHitbox(28,24);this.through=true
 },async onAction(player:any){
  const destinations=worlds.filter(w=>['sunscar','frostwild','verdant'].includes(w.id))
  const choice=await player.showChoices('Wohin soll dich der Reisestein führen?',[
   ...destinations.map(w=>({text:w.title,value:w.id})),{text:'Hier bleiben',value:''}])
  if(destinations.some(w=>w.id===choice?.value))await player.changeMap(choice.value,'start')
 }}}]
}

export default defineModule<RpgServer>({
  engine:{onStep:stepPlayers},
  player,
  maps: worlds.map(world=>({
    id: world.id,
    positions: { start: world.start },
    events: [...world.objects.map(object=>({id:object.id,x:object.x,y:object.y,event:worldEvent(object,world)})),...biomeGateway(world)]
  }))
});
