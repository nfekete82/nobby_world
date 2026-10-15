import { RpgPlayer, MAXHP, MAXSP, type RpgPlayerHooks } from '@rpgjs/server'
import art from '../../art/registry.json'
import { ARCANE_ACTION, castArcaneBolt } from './arcane-bolt'
import { createManaClock, markManaActive, regenerateIdleMana, IDLE_MANA_TICK_MS } from '../../combat/mana-regen.mjs'
import { allocatePoint, expThreshold, grantLevelPoints, statBonuses } from '../../progression/player-growth.mjs'
import { characterClass, selectClass, restoreClass, CHARACTER_CLASSES } from '../../progression/character-class.mjs'
import { companions, cleanupCompanions } from './skeleton-companions'
import { resumeGame, saveResume } from './save-state'
import { stepEnemyTargets } from './enemy-targets'

// RPG-JS makes these custom props reactive, client-synchronized and save-persistent.
const growthProps = {
    nobbyClass: { $default: '', $syncWithClient: true, $permanent: true },
    nobbySkeletons: { $default: 0, $syncWithClient: true, $permanent: false },
    nobbySummonUntil: { $default: 0, $syncWithClient: true, $permanent: false },
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
const manaTimers=new Map<string,{clock:ReturnType<typeof createManaClock>,nextSave:number,lastStep:number,mapId:string}>()
const mapIdOf=(player:RpgPlayer)=>String(player.getCurrentMap()?.id??'')
function connectClock(player:RpgPlayer){
    manaTimers.set(player.id,{clock:createManaClock(),nextSave:Date.now()+5000,lastStep:0,mapId:mapIdOf(player)})
}
/** Use the engine's current room entities, never capture a pre-transfer player
 * in a JavaScript interval. RPG-JS replaces those instances during joins. */
export function stepPlayers(server:any){
    const now=Date.now()
    stepEnemyTargets(server.subRoom,now)
    for(const player of Object.values(server.subRoom?.players?.()??{}) as RpgPlayer[]){
        const entry=manaTimers.get(player.id)
        if(!entry||now-entry.lastStep<IDLE_MANA_TICK_MS)continue
        entry.lastStep=now
        if(characterClass(player))companions(player).tick(now)
        regenerateIdleMana(player,entry.clock,Number(player.param[MAXSP]),now)
        if(now>=entry.nextSave&&characterClass(player)){
            entry.nextSave=now+5000
            void saveResume(player).catch(error=>console.error('[Nobby resume]',error))
        }
    }
}
const noteAction=(player:RpgPlayer)=>{
    const entry=manaTimers.get(player.id)
    if(entry)markManaActive(entry.clock)
}

export const player: RpgPlayerHooks = {
    props:growthProps,
    async onConnected(player: RpgPlayer) {
        player.initializeDefaultStats()
        applyGrowth(player)
        publishExperience(player)
        await player.changeMap('simplemap', 'start')
        player.name = 'nobby'
        const chosen=characterClass(player)
        player.setGraphic(CHARACTER_CLASSES[chosen]?.graphic??'hero')
        player.canMove=!!chosen
        player.setHitbox(...art.actorHitbox as [number,number])
        connectClock(player)
        await resumeGame(player)
    },
    onJoinMap(player:RpgPlayer){
        connectClock(player)
        const choice=characterClass(player)
        if(choice)player.setGraphic(CHARACTER_CLASSES[choice].graphic)
    },
    onLoad(player:RpgPlayer,snapshot:any){
        cleanupCompanions(player,true)
        restoreClass(player,snapshot)
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
        const entry=manaTimers.get(player.id)
        if(entry&&mapIdOf(player)&&entry.mapId!==mapIdOf(player))return
        cleanupCompanions(player,true)
        manaTimers.delete(player.id)
    },
    onLeaveMap(player:RpgPlayer){cleanupCompanions(player,true)},
    onDead(player:RpgPlayer){cleanupCompanions(player)},
    onInput(player: RpgPlayer, { action, data }: any) {
        if(action==='nobby:choose-class'){
            if(selectClass(player,data?.class))void saveResume(player)
            return
        }
        if(!characterClass(player))return
        if(action==='nobby:summon'){
            try{
                const controller=companions(player)
                void controller.summon().then(ok=>{if(ok)noteAction(player)})
                    .catch(error=>console.error('[Nobby summon input]',error))
            }catch(error){console.error('[Nobby summon controller]',error)}
            return
        }
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
