import { type EventDefinition, MAXHP } from '@rpgjs/server'
import { BattleAi, EnemyType, AttackPattern } from '@rpgjs/action-battle/server'
import worlds from '../../generated/worlds.json'
import { combatOptions } from './combat'

export function worldEvent(object: any): EventDefinition {
    if (object.kind === 'monster') return {
        name: object.name,
        onInit() {
            this.setGraphic('enemy-warrior')
            this.setHitbox(24, 24)
            this.setParameter(MAXHP, object.hp || 65 + (object.level - 1) * 25)
            this.paramsModifier = { atk: {value:8 + object.level * 3}, pdef: {value:2 + object.level} }
            this.allRecovery()
            new BattleAi(this, {
                enemyType: object.enemy === 'berserker' ? EnemyType.Berserker : EnemyType.Aggressive,
                dodgeChance: 0, visionRange: object.vision, attackRange: 60, attackCooldown: 1400,
                attackPatterns: [AttackPattern.Melee],
                animations: { ...combatOptions.animations, attack: { graphic: 'enemy-warrior', animationName: 'attack' } },
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
        onInit() { this.setGraphic('female') },
        async onAction(player) { await player.showText(object.text) }
    }
    return {
        name: object.name,
        onInit() { this.setGraphic('portal-marker'); this.setHitbox(28,28) },
        async onAction(player) {
            const target=worlds.find(w=>w.id===object.target)
            if(target)await player.changeMap(target.id,'start')
        }
    }
}
