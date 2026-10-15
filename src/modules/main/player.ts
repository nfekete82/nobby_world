import { RpgPlayer, MAXHP, type RpgPlayerHooks } from '@rpgjs/server'
import art from '../../art/registry.json'
import { ARCANE_ACTION, castArcaneBolt } from './arcane-bolt'

export const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.initializeDefaultStats()
        player.paramsModifier = { atk: {value:14}, pdef: {value:8} }
        player.changeMap('simplemap', 'start')
        player.name = 'nobby'
        player.setGraphic('hero')
        player.setHitbox(...art.actorHitbox as [number,number])
    },
    onInput(player: RpgPlayer, { action, data }: any) {
        if (action === ARCANE_ACTION) {
            castArcaneBolt(player,data)
            return
        }
        if (action == 'escape') {
            player.callMainMenu()
        }
        if(action==='heal'&&player.sp>=25&&player.hp>0&&player.hp<player.param[MAXHP]){
            const now=Date.now(),p=player as any
            if((p.nobbyHealUntil??0)>now)return
            p.nobbyHealUntil=now+1200;player.sp-=25
            player.hp=Math.min(player.param[MAXHP],player.hp+Math.floor(player.param[MAXHP]*.25))
            void player.setAnimation('heal',1,{durationMs:700})
        }
    }
}
