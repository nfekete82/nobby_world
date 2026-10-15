import { defineModule } from "@rpgjs/common";
import { RpgServer } from "@rpgjs/server";
import { player } from './player'
import { worldEvent } from "./world-events";
import worlds from '../../generated/worlds.json';

export default defineModule<RpgServer>({
  player,
  maps: worlds.map(world=>({
    id: world.id,
    positions: { start: world.start },
    events: world.objects.map(object=>({id:object.id,x:object.x,y:object.y,event:worldEvent(object,world)}))
  }))
});
