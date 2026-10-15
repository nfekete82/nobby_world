import { RpgPlayer, MAXHP, MAXSP, type RpgPlayerHooks } from '@rpgjs/server'
import art from '../../art/registry.json'
import { ARCANE_ACTION, castArcaneBolt } from './arcane-bolt'
import { createManaClock, markManaActive, regenerateIdleMana, IDLE_MANA_TICK_MS } from '../../combat/mana-regen.mjs'
import { allocatePoint, expThreshold, grantLevelPoints, statBonuses } from '../../progression/player-growth.mjs'

// RPG-JS makes these custom props reactive, client-synchronized and save-persistent.
const growthProps = {
    nobbyPoints: { $default: 0, $syncWithClient: true, $permanent: true },
    nobbyStatHealth: { $default: 0, $syncWithClient: true, $permanent: true },
    nobbyStatMana: { $default: 0, $syncWithClient: true, $permanent: true },
    nobbyStatMagic: { $default: 0, $syncWithClient: true, $permanent: true },
    nobbyStatDefense: { $default: 0, $syncWithClient: true, $permanent: true },
    nobbyXpFloor: { $default: 0, $syncWithClient: true, $permanent: false },
    nobbyXpNext: { $default: 150, $syncWithClient: true, $permanent: false }
}
const setSynced=(player:RpgPlayer,key:string,value:number)=>{
    const prop=(player as any)[key]
    if(typeof prop==='function' && typeof prop.set==='function')prop.set(value)
}
function publishExperience(player:RpgPlayer){
    setSynced(player,'nobbyXpFloor',expThreshold(player.level,player.expCurve))
    setSynced(player,'nobbyXpNext',player.expForNextlevel)
}
function applyGrowth(player:RpgPlayer,fillDifference=false){
    const oldHpMax=Number(player.param[MAXHP])||0,oldSpMax=Number(player.param[MAXSP])||0
    const oldHp=Number(player.hp)||0,oldSp=Number(player.sp)||0
    const bonus=statBonuses(player)
    player.paramsModifier={
        ...player.paramsModifier,
        [MAXHP]:{value:bonus.maxHp},
        [MAXSP]:{value:bonus.maxSp},
        atk:{value:14},
        pdef:{value:8+bonus.pdef}
    }
    if(fillDifference){
        // Raising a maximum preserves missing HP/SP and never resurrects a dead hero.
        if(oldHp>0)player.hp=Math.min(player.param[MAXHP],oldHp+Math.max(0,Number(player.param[MAXHP])-oldHpMax))
        player.sp=Math.min(player.param[MAXSP],oldSp+Math.max(0,Number(player.param[MAXSP])-oldSpMax))
    }
}
// One scheduled server-side regeneration task per connected character.
const manaTimers=new WeakMap<RpgPlayer,{clock:ReturnType<typeof createManaClock>,timer:ReturnType<typeof setInterval>}>()
const noteAction=(player:RpgPlayer)=>{
    const entry=manaTimers.get(player)
    if(entry)markManaActive(entry.clock)
}

export const player: RpgPlayerHooks = {
    props:growthProps,
    onConnected(player: RpgPlayer) {
        player.initializeDefaultStats()
        applyGrowth(player)
        publishExperience(player)
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
    onLoad(player:RpgPlayer){
        // Saved attribute choices are authoritative; rebuild derived modifiers.
        applyGrowth(player)
        publishExperience(player)
    },
    onLevelUp(player:RpgPlayer,levels:number){
        const gained=grantLevelPoints(player,levels)
        if(!gained)return
        // RPG-JS fires the hook before writing the new level signal.
        queueMicrotask(()=>{
            publishExperience(player)
            if(player.hp>0)player.hp=Number(player.param[MAXHP])
            player.sp=Number(player.param[MAXSP])
        })
        player.showNotification(`Levelaufstieg! +${gained} Attributpunkte`)
    },
    onMove(player: RpgPlayer){ noteAction(player) },
    onDisconnected(player: RpgPlayer){
        const entry=manaTimers.get(player)
        if(entry){clearInterval(entry.timer);manaTimers.delete(player)}
    },
    onInput(player: RpgPlayer, { action, data }: any) {
        if(action==='nobby:allocate-stat'){
            // The client chooses a stat name, never a point count or new total.
            if(allocatePoint(player,data?.stat))applyGrowth(player,true)
            return
        }
        if (action === ARCANE_ACTION) {
            noteAction(player)
            castArcaneBolt(player,data)
            return
        }
        if (action == 'escape') player.callMainMenu()
        if(action==='heal'&&player.sp>=25&&player.hp>0&&player.hp<player.param[MAXHP]){
            const now=Date.now(),p=player as any
            if((p.nobbyHealUntil??0)>now)return
            p.nobbyHealUntil=now+1200;noteAction(player);player.sp-=25
            player.hp=Math.min(player.param[MAXHP],player.hp+Math.floor(player.param[MAXHP]*.25))
            void player.setAnimation('heal',1,{durationMs:700})
        }
    }
}
