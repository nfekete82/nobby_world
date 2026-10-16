import { type EventDefinition, MAXHP } from '@rpgjs/server'
import { BattleAi, EnemyType, AttackPattern } from '@rpgjs/action-battle/server'
import worlds from '../../generated/worlds.json'
import { combatOptions } from './combat'
import { ART } from '../../art/sprites'
import { sheepEvent } from './sheep-event'
import { enemyGraphic } from '../../art/enemies.mjs'
import { desertSnakeEvent } from './desert-snake-event'
import { refreshEnemyTargetNow } from './enemy-targets'

export function worldEvent(object: any, world?: any): EventDefinition {
    if (object.kind === 'monster') return {
        name: object.name,
        onInit() {
            // Stable authored ID survives RPG-JS dynamic event creation.
            // Used only server-side to resolve and authorize spell targets.
            ;(this as any).nobbyWorldObjectId=object.id
            ;(this as any).nobbyAggroRange=object.vision
            ;(this as any).nobbyNearestTargetId=''
            ;(this as any).nobbyRefreshTarget=()=>refreshEnemyTargetNow(this)
            const graphic=object.asset||enemyGraphic(object.enemy)
            this.setGraphic(graphic)
            this.setHitbox(...(ART.assets as any)[graphic].hitbox as [number,number])
            this.setParameter(MAXHP, object.hp || 65 + (object.level - 1) * 25)
            this.paramsModifier = { atk: {value:8 + object.level * 3}, pdef: {value:2 + object.level} }
            this.allRecovery()
            new BattleAi(this, {
                faction:'enemies',targets:['players'],
                enemyType: object.enemy === 'berserker' ? EnemyType.Berserker : EnemyType.Aggressive,
                dodgeChance: 0, visionRange: object.vision, attackRange: 60, attackCooldown: 1050, fleeThreshold: 0,
                attackPatterns: [AttackPattern.Melee],
                animations: { ...combatOptions.animations, attack: { graphic, animationName: 'attack' },
                    ...(ART.assets[graphic]?.animations?.death?{hurt:{graphic,animationName:'hit'},die:{graphic,animationName:'death'}}:{}) },
                rewards: { exp: 15 * object.level, gold: 5 * object.level },
                presentation: {
                    name: `${object.name} · St. ${object.level}`,
                    healthBar: { style: {width:52,height:5}, text: `${object.name} · ${object.level}` }
                }
            })
        }
    }
    if (object.kind === 'npc') return {
        name: object.name,
        onInit() { this.setGraphic(object.asset||'female'); this.setHitbox(...(ART.assets as any)[object.asset||'female'].hitbox as [number,number]) },
        async onAction(player) { await player.showText(object.text) }
    }
    if(object.kind==='prop'&&(object.asset==='sheep'||(ART.assets as any)[object.asset]?.editorBaseId==='sheep'))return sheepEvent(object,world)
    if(object.kind==='prop'&&(object.asset==='desert-snake'||(ART.assets as any)[object.asset]?.editorBaseId==='desert-snake'))return desertSnakeEvent(object,world)
    if(object.kind==='prop')return {
        name:object.name,
        // Physics bodies normally have mass 100; even a non-moving event can
        // be displaced by a player or NPC. All authored scenery is fixed.
        pushable:false,
        mass:0,
        onInit(){
            const asset=ART.assets[object.asset as keyof typeof ART.assets]
            this.setGraphic(object.asset)
            this.setHitbox(...asset.hitbox as [number,number])
            this.through=!(asset as any).solid
            this.pushable=false
            this.setMass(0)
            this.canMove=false
        }
    }
    return {
        name: object.name,
        onInit() { this.setGraphic(['portal-stone','portal-marker']); this.setHitbox(...ART.assets['portal-marker'].hitbox as [number,number]) },
        async onAction(player) {
            const target=worlds.find(w=>w.id===object.target)
            if(target)await player.changeMap(target.id,'start')
        }
    }
}
