import {test} from 'node:test'
import assert from 'node:assert/strict'
import {
 createManaClock,markManaActive,regenerateIdleMana,
 IDLE_MANA_PER_SECOND,IDLE_MANA_TICK_MS,IDLE_MANA_GRACE_MS
} from '../src/combat/mana-regen.mjs'

function actor(){
 const map={},p={px:96,py:96,hp:100,sp:50,map,
  x(){return this.px},y(){return this.py},getCurrentMap(){return this.map}}
 return p
}
const tick=(p,c,now,max=100)=>regenerateIdleMana(p,c,max,now)
test('idle mana grows exactly five per second after a short standstill',()=>{
 const p=actor(),c=createManaClock(0)
 assert.equal(IDLE_MANA_PER_SECOND,5)
 assert.equal(IDLE_MANA_TICK_MS,200)
 assert.ok(IDLE_MANA_GRACE_MS<=300)
 assert.equal(tick(p,c,0),0)
 assert.equal(tick(p,c,200),0)
 assert.ok(Math.abs(tick(p,c,450)-1)<1e-9)
 assert.ok(Math.abs(tick(p,c,1250)-4)<1e-9)
 assert.equal(p.sp,55)
})
test('movement pauses regen and restarts grace period',()=>{
 const p=actor(),c=createManaClock(0)
 tick(p,c,0);tick(p,c,1000)
 assert.equal(p.sp,53.75)
 p.px+=12
 assert.equal(tick(p,c,1200),0)
 assert.equal(tick(p,c,1400),0)
 assert.equal(tick(p,c,1700),1.25)
 assert.equal(p.sp,55)
})
test('server onMove and spell action reset idle time even without position changes',()=>{
 const p=actor(),c=createManaClock(0)
 tick(p,c,0);tick(p,c,1250)
 const old=p.sp
 markManaActive(c,1300)
 assert.equal(tick(p,c,1400),0)
 assert.ok(Math.abs(tick(p,c,1800)-1.25)<1e-9)
 assert.ok(p.sp>old)
})
test('mana cannot overflow max, and never regens while dead, mapless or invalid',()=>{
 const p=actor(),c=createManaClock(0)
 p.sp=98
 tick(p,c,0);tick(p,c,3000)
 assert.equal(p.sp,100)
 p.sp=40;p.hp=0
 assert.equal(tick(p,c,4000),0)
 p.hp=100;p.map=null
 assert.equal(tick(p,c,5000),0)
 p.map={}
 assert.equal(tick(p,c,5200),0)
 assert.equal(tick(p,c,6000),2.75)
})
test('lag is clamped to one second, and rewinding time is safe',()=>{
 const p=actor(),c=createManaClock(0)
 tick(p,c,0)
 tick(p,c,15000)
 assert.equal(p.sp,55)
 assert.equal(tick(p,c,100),0)
 assert.equal(tick(p,c,200),0)
})
test('authoritative player integration owns one timer and disposes it on disconnect',()=>{
 const source=(await import('node:fs')).readFileSync('src/modules/main/player.ts','utf8')
 assert.match(source,/regenerateIdleMana\(player,clock,Number\(player\.param\[MAXSP\]\)\)/)
 assert.match(source,/onMove\(player: RpgPlayer\)/)
 assert.match(source,/onDisconnected\(player: RpgPlayer\)/)
 assert.match(source,/clearInterval\(entry\.timer\)/)
 assert.match(source,/noteAction\(player\)/)
})
