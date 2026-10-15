import {test} from 'node:test'
import assert from 'node:assert/strict'
import {applyArcaneImpact} from '../src/combat/arcane-impact.mjs'

function battle(){
 const player={id:'nobby',hp:100}
 const ai={
  visionRange:110,target:null,hitCount:0,
  getTarget(){return this.target},
  handleDamage(attacker,{damage,defeated}){
   this.target=attacker;this.hitCount++;this.lastDamage=damage
   this.state=defeated?'defeated':'combat'
  }
 }
 const enemy={id:'object-3',hp:65,battleAi:ai}
 return {player,enemy,ai}
}
test('mage bolt deals 18 damage and provokes pursuit when physical formula yields zero',()=>{
 const {player,enemy,ai}=battle()
 const result=applyArcaneImpact(player,enemy,()=>({damage:0}))
 assert.equal(result.damage,18)
 assert.equal(result.hpAfter,47)
 assert.equal(enemy.hp,47)
 assert.equal(ai.getTarget(),player)
 assert.equal(ai.state,'combat')
 assert.equal(ai.hitCount,1)
 assert.ok(ai.visionRange>=440)
})
test('native RPGJS damage is used without double-hitting the enemy',()=>{
 const {player,enemy,ai}=battle()
 const result=applyArcaneImpact(player,enemy,(p,target)=>{
  target.hp-=12
  ai.handleDamage(p,{damage:12,defeated:false})
  return {damage:12}
 })
 assert.equal(result.damage,12)
 assert.equal(result.hpAfter,53)
 assert.equal(ai.hitCount,1)
 assert.equal(ai.getTarget(),player)
})
test('broken native damage formula cannot prevent mage HP loss and retaliation',()=>{
 const {player,enemy,ai}=battle()
 const oldError=console.error
 console.error=()=>{}
 try{
  const r=applyArcaneImpact(player,enemy,()=>{throw Error('physical formula missing')})
  assert.equal(r.damage,18)
  assert.equal(r.engineError,'physical formula missing')
  assert.equal(ai.getTarget(),player)
 }finally{console.error=oldError}
})
test('lethal spell impact notifies the normal AI defeat handler',()=>{
 const {player,enemy,ai}=battle()
 enemy.hp=9
 const r=applyArcaneImpact(player,enemy,()=>({damage:0}))
 assert.equal(r.damage,9)
 assert.equal(r.hpAfter,0)
 assert.equal(ai.state,'defeated')
})
