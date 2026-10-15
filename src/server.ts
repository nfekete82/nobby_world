import { createServer,  provideServerModules, LocalStorageSaveStorageStrategy } from "@rpgjs/server";
import { provideMain } from "./modules/main";
import { provideSaveStorage } from "@rpgjs/server";
import { provideTiledMap } from "@rpgjs/tiledmap/server";
import { provideActionBattle } from "@rpgjs/action-battle/server";
import { combatOptions } from './modules/main/combat';

export default createServer({
    providers: [
      provideMain(),
      provideActionBattle(combatOptions),
      provideSaveStorage(new LocalStorageSaveStorageStrategy({ key: "nobby_world_rpgjs_v1" })),
      provideServerModules([]),
      provideTiledMap()
    ]
  });
