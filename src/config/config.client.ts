import { provideClientGlobalConfig, provideClientModules, Presets } from "@rpgjs/client";
import { provideMain } from "../modules/main";
import { provideTiledMap } from "@rpgjs/tiledmap/client";
import { display } from "../modules/main/display";
import "../fullscreen";
import { provideActionBattle } from "@rpgjs/action-battle";
import { combatOptions } from '../modules/main/combat';

export default {
  providers: [
    provideTiledMap({
      basePath: "map",
    }),
    provideClientGlobalConfig(),
    provideMain(),
    provideActionBattle(combatOptions),
    provideClientModules([
      {
        engine: display,
        spritesheets: [
          {
            id: 'enemy-warrior',
            image: 'spritesheets/enemy-warrior-idle.png',
            framesWidth: 8, framesHeight: 1, scale: [.4,.4], trimTransparentBounds: true,
            textures: {
              stand: { animations: () => [[...Array.from({length:8},(_,i)=>({time:i*10,frameX:i,frameY:0})),{time:80}]] },
              walk: { image: 'spritesheets/enemy-warrior-run.png', framesWidth: 6, animations: () => [[...Array.from({length:6},(_,i)=>({time:i*8,frameX:i,frameY:0})),{time:48}]] },
              attack: { image: 'spritesheets/enemy-warrior-attack1.png', framesWidth: 4, animations: () => [[...Array.from({length:4},(_,i)=>({time:i*8,frameX:i,frameY:0})),{time:32}]] }
            }
          },
          {
            id: 'portal-marker', image: 'spritesheets/portal.svg',
            ...Presets.RMSpritesheet(1,1,0)
          },
          {
            id: 'hero',
            image: 'spritesheets/hero.png',
            ...Presets.RMSpritesheet(3, 4)
          },
          {
            id: 'female',
            image: 'spritesheets/female.png',
             ...Presets.RMSpritesheet(3, 4)
          }
        ]
      }
    ])
  ],
};
