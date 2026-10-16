import { LocalStorageSaveStorageStrategy } from '@rpgjs/server'
export const saveStorage=new LocalStorageSaveStorageStrategy({key:'nobby_world_rpgjs_v1'})
// Resume is separate from numbered user saves: choosing a class must never
// overwrite slot zero or any manually saved adventure.
const resumeStorage=new LocalStorageSaveStorageStrategy({key:'nobby_world_resume_v1'})
export async function saveResume(player:any){
 await resumeStorage.save(player,0,JSON.stringify(player.snapshot()),{
  map:player.getCurrentMap()?.id,date:new Date().toISOString(),level:player.level
 })
}
export async function resumeGame(player:any){
 let slot=await resumeStorage.get(player,0)
 if(!slot){
  const slots=await saveStorage.list(player)
  const latest=slots.map((meta,index)=>({meta,index})).filter(s=>s.meta)
   .sort((a,b)=>String(b.meta?.date??'').localeCompare(String(a.meta?.date??'')))[0]
  if(latest)slot=await saveStorage.get(player,latest.index)
 }
 if(!slot?.snapshot)return false
 await player.applySnapshot(slot.snapshot)
 if(slot.map)await player.changeMap(slot.map,{x:player.x(),y:player.y(),z:player.z()})
 return true
}
