import { createServer,  provideServerModules } from "@rpgjs/server";
import { provideMain } from "./modules/main";
import { provideSaveStorage } from "@rpgjs/server";
import { provideTiledMap } from "@rpgjs/tiledmap/server";
import { provideActionBattle } from "@rpgjs/action-battle/server";
import { combatOptions } from './modules/main/combat';
import { saveStorage } from './modules/main/save-state';

export default createServer({
    providers: [
      provideMain(),
      provideActionBattle(combatOptions),
      provideSaveStorage(saveStorage),
      provideServerModules([]),
      provideTiledMap()
    ]
  });
