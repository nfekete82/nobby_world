import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {POINTS_PER_LEVEL,grantLevelPoints,allocatePoint,statBonuses,expThreshold} from '../src/progression/player-growth.mjs'
import {applyArcaneImpact} from '../src/combat/arcane-impact.mjs'
const signal=(initial)=>{let value=initial;const get=()=>value;get.set=(v)=>value=v;return get}
function character(){
 return {nobbyPoints:signal(0),nobbyStatHealth:signal(0),nobbyStatMana:signal(0),nobbyStatMagic:signal(0),nobbyStatDefense:signal(0)}
}
test('three unspent points per level, including multi-level jumps',()=>{
 const p=character()
 assert.equal(POINTS_PER_LEVEL,3)
 assert.equal(grantLevelPoints(p,1),3)
 assert.equal(grantLevelPoints(p,2),6)
 assert.equal(p.nobbyPoints(),9)
 assert.equal(grantLevelPoints(p,0),0)
 assert.equal(grantLevelPoints(p,1.5),0)
})
test('server spends exactly one point and refuses invalid, exhausted or forged stats',()=>{
 const p=character()
 assert.equal(allocatePoint(p,'health'),false)
 grantLevelPoints(p,1)
 assert.equal(allocatePoint(p,'health'),true)
 assert.equal(allocatePoint(p,'mana'),true)
 assert.equal(allocatePoint(p,'magic'),true)
 assert.equal(allocatePoint(p,'magic'),false)
 assert.equal(allocatePoint(p,'__proto__'),false)
 assert.equal(allocatePoint(p,{stat:'health'}),false)
 assert.equal(p.nobbyPoints(),0)
 assert.deepEqual(statBonuses(p),{maxHp:10,maxSp:10,magic:2,pdef:0})
})
test('defense bonuses are independent and stat cap cannot be bypassed',()=>{
 const p=character()
 grantLevelPoints(p,1)
 allocatePoint(p,'defense')
 assert.equal(statBonuses(p).pdef,2)
 p.nobbyStatHealth.set(999)
 assert.equal(allocatePoint(p,'health'),false)
 assert.equal(p.nobbyPoints(),2)
})
test('XP thresholds follow RPG-JS native experience curve',()=>{
 const curve={basis:30,extra:20,accelerationA:30,accelerationB:30}
 assert.equal(expThreshold(1,curve),0)
 assert.ok(expThreshold(3,curve)>expThreshold(2,curve))
 assert.equal(expThreshold(2,curve),Math.round(30*1*2*3/(6+4/50/30)+20))
})
test('magic adds two spell damage per point and does not double-kill',()=>{
 const p=character();grantLevelPoints(p,1);allocatePoint(p,'magic');allocatePoint(p,'magic')
 let hits=0,defeats=0
 const target={hp:14,battleAi:{handleDamage(_p,{defeated}){hits++;if(defeated)defeats++},getTarget(){return p}}}
 assert.equal(applyArcaneImpact(p,target).damage,14)
 assert.equal(target.hp,0)
 assert.equal(applyArcaneImpact(p,target).damage,0)
 assert.equal(hits,1);assert.equal(defeats,1)
})
test('RPG-JS owns rewards, while attribute changes use synced persisted properties',()=>{
 const player=fs.readFileSync('src/modules/main/player.ts','utf8')
 const events=fs.readFileSync('src/modules/main/world-events.ts','utf8')
 const hud=fs.readFileSync('src/ui/hud.ts','utf8')
 assert.match(events,/rewards: \{ exp: 15 \* object.level, gold: 5 \* object.level \}/)
 assert.match(player,/onLevelUp\(player:RpgPlayer,levels:number\)/)
 assert.match(player,/onLoad\(player:RpgPlayer,snapshot:any\)/)
 assert.match(player,/\$permanent: true/)
 assert.match(player,/allocatePoint\(player,data\?\.stat\)/)
 assert.match(hud,/activeEngine.processAction\('nobby:allocate-stat',\{stat:button.dataset.stat\}\)/)
 assert.match(hud,/player\._exp\?\.\(\)/)
})

test('required XP grows strictly with every level (RPG-JS default curve)',()=>{
 const curve={basis:30,extra:20,accelerationA:30,accelerationB:30}
 const required=Array.from({length:50},(_,index)=>
   expThreshold(index+2,curve)-expThreshold(index+1,curve))
 assert.deepEqual(required.slice(0,5),[50,112,204,329,485])
 assert.ok(required.every((needed,index)=>needed>0&&(index===0||needed>required[index-1])))
})
test('character screen shows XP within the current level and missing XP',()=>{
 const hud=fs.readFileSync('src/ui/hud.ts','utf8')
 assert.match(hud,/const earned=Math.max\(0,currentExp-floor\),needed=Math.max\(1,next-floor\)/)
 assert.match(hud,/Noch .* EP bis Stufe/)
 assert.match(hud,/nobby-stats-xp/)
})
test('OrbStack live editor is optional, persistent and local-only',()=>{
 const compose=fs.readFileSync('compose.yaml','utf8')
 assert.match(compose,/editor:/)
 assert.match(compose,/profiles: \["editor"\]/)
 assert.match(compose,/restart: unless-stopped/g)
 assert.match(compose,/127\.0\.0\.1:5173:5173/)
 assert.match(compose,/\.\/:\/app/)
 assert.match(compose,/--host 0\.0\.0\.0 --port 5173 --strictPort/)
})

test('compose passes shell lock_hash literally to the editor container',()=>{
 const compose=fs.readFileSync('compose.yaml','utf8')
 const echoLine=compose.split('\n').find(line=>line.includes('node_modules/.nobby-lock')&&line.includes('echo'))
 assert.ok(echoLine,'lock file write must exist')
 assert.ok(echoLine.includes('$$'+'lock_hash'),'Compose must escape shell variables using two dollar signs')
 assert.ok(!echoLine.includes('echo "'+'$'+'lock_hash"'),'single dollar is expanded prematurely by Compose')
})
