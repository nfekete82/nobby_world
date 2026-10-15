import {test} from 'node:test'
import assert from 'node:assert/strict'
import {applyArcaneImpact} from '../src/combat/arcane-impact.mjs'
import {ARCANE_DAMAGE} from '../src/combat/arcane-rules.mjs'

function battle(){
 const player={id:'nobby',hp:100}
 const ai={
  visionRange:110,target:null,hitCount:0,
  getTarget(){return this.target},
  handleDamage(attacker,{damage,defeated}){
   this.target=attacker
   this.hitCount++
   this.lastDamage=damage
   this.state=defeated?'defeated':'combat'
  }
 }
 const enemy={id:'object-3',hp:65,battleAi:ai}
 return {player,enemy,ai}
}
test('arcane bolt deals exactly 10 HP, starts enemy pursuit and keeps mana separate',()=>{
 const {player,enemy,ai}=battle()
 const result=applyArcaneImpact(player,enemy)
 assert.equal(ARCANE_DAMAGE,10)
 assert.deepEqual(result,{damage:10,hpBefore:65,hpAfter:55})
 assert.equal(enemy.hp,55)
 assert.equal(ai.getTarget(),player)
 assert.equal(ai.state,'combat')
 assert.equal(ai.hitCount,1)
 assert.ok(ai.visionRange>=440)
})
test('spell potency does not inherit physical melee damage or change over repeated casts',()=>{
 const {player,enemy,ai}=battle()
 const first=applyArcaneImpact(player,enemy)
 const second=applyArcaneImpact(player,enemy)
 assert.equal(first.damage,10)
 assert.equal(second.damage,10)
 assert.equal(enemy.hp,45)
 assert.equal(ai.hitCount,2)
 assert.equal(ai.lastDamage,10)
})
test('low-health monster dies from one appropriately capped spell',()=>{
 const {player,enemy,ai}=battle()
 enemy.hp=7
 const result=applyArcaneImpact(player,enemy)
 assert.equal(result.damage,7)
 assert.equal(result.hpAfter,0)
 assert.equal(ai.state,'defeated')
 assert.equal(ai.hitCount,1)
})
test('dead or non-hostile events never receive mage damage',()=>{
 const {player,enemy,ai}=battle()
 enemy.hp=0
 assert.equal(applyArcaneImpact(player,enemy).damage,0)
 enemy.hp=65
 enemy.battleAi=null
 assert.equal(applyArcaneImpact(player,enemy).damage,0)
 assert.equal(ai.hitCount,0)
})
