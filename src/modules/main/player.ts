import { RpgPlayer, MAXHP, MAXSP, type RpgPlayerHooks } from '@rpgjs/server'
import art from '../../art/registry.json'
import { ARCANE_ACTION, castArcaneBolt } from './arcane-bolt'
import { createManaClock, markManaActive, regenerateIdleMana, IDLE_MANA_TICK_MS } from '../../combat/mana-regen.mjs'

// One scheduled server-side regeneration task per connected character. The
// WeakMap is not serialized into game saves and is cleared on disconnect.
const manaTimers=new WeakMap<RpgPlayer,{clock:ReturnType<typeof createManaClock>,timer:ReturnType<typeof setInterval>}>()
const noteAction=(player:RpgPlayer)=>{
    const entry=manaTimers.get(player)
    if(entry)markManaActive(entry.clock)
}

export const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.initializeDefaultStats()
        player.paramsModifier = { atk: {value:14}, pdef: {value:8} }
        player.changeMap('simplemap', 'start')
        player.name = 'nobby'
        player.setGraphic('hero')
        player.setHitbox(...art.actorHitbox as [number,number])
        const existing=manaTimers.get(player)
        if(existing)clearInterval(existing.timer)
        const clock=createManaClock()
        const timer=setInterval(()=>{
            regenerateIdleMana(player,clock,Number(player.param[MAXSP]))
        },IDLE_MANA_TICK_MS)
        manaTimers.set(player,{clock,timer})
    },
    onMove(player: RpgPlayer){
        noteAction(player)
    },
    onDisconnected(player: RpgPlayer){
        const entry=manaTimers.get(player)
        if(entry){clearInterval(entry.timer);manaTimers.delete(player)}
    },
    onInput(player: RpgPlayer, { action, data }: any) {
        if (action === ARCANE_ACTION) {
            noteAction(player)
            castArcaneBolt(player,data)
            return
        }
        if (action == 'escape') {
            player.callMainMenu()
        }
        if(action==='heal'&&player.sp>=25&&player.hp>0&&player.hp<player.param[MAXHP]){
            const now=Date.now(),p=player as any
            if((p.nobbyHealUntil??0)>now)return
            p.nobbyHealUntil=now+1200;noteAction(player);player.sp-=25
            player.hp=Math.min(player.param[MAXHP],player.hp+Math.floor(player.param[MAXHP]*.25))
            void player.setAnimation('heal',1,{durationMs:700})
        }
    }
}
