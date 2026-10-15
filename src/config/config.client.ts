import '../art/pixel-rendering';
import { spritesheets } from '../art/sprites';
import { provideClientGlobalConfig, provideClientModules } from "@rpgjs/client";
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
    provideClientGlobalConfig({bootstrapCanvasOptions:{antialias:false,resolution:1,roundPixels:true},keyboardControls:{heal:'h'}}),
    provideMain(),
    provideActionBattle(combatOptions),
    provideClientModules([
      {
        engine: display,
        spritesheets: spritesheets()
      }
    ])
  ],
};
