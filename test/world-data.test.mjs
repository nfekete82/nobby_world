import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {readWorld,compileWorlds,projectRoot} from '../scripts/world-data.mjs'

function fixture(body,options=''){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nobby-map-')),file=path.join(dir,'test.tmx')
  fs.writeFileSync(file,`<map orientation="orthogonal" width="25" height="20" tilewidth="32" tileheight="32" ${options}><properties><property name="nobbyWorld" type="bool" value="true"/></properties><objectgroup><object id="1" class="start" x="30" y="40"><point/></object>${body}</objectgroup></map>`)
  return {file,cleanup:()=>fs.rmSync(dir,{recursive:true})}
}
function withMap(body,fn,options){const f=fixture(body,options);try{fn(f.file)}finally{f.cleanup()}}

test('authored worlds compile with valid starts and resolvable map portals',()=>{
  const worlds=compileWorlds();assert.ok(worlds.length>=1)
  for(const w of worlds){
    assert.ok(Number.isFinite(w.start.x)&&Number.isFinite(w.start.y))
    for(const o of w.objects.filter(o=>o.kind==='portal'))assert.ok(worlds.some(t=>t.id===o.target))
  }
})
test('monster custom properties and nested group offsets survive map import',()=>withMap('<group offsetx="10" offsety="15"><objectgroup><object id="2" class="monster" x="100" y="120"><properties><property name="enemy" value="berserker"/><property name="level" type="int" value="7"/><property name="hp" type="int" value="234"/></properties></object></objectgroup></group>',file=>{
  // The nested group is inside the fixture objectgroup; traversal accepts both.
  const m=readWorld(file).objects[0];assert.equal(m.x,110);assert.equal(m.y,135);assert.equal(m.level,7);assert.equal(m.hp,234);assert.equal(m.enemy,'berserker')
}))
test('Tiled object templates provide defaults while local overrides win',()=>{
  const template=path.join(projectRoot,'editor/templates/Ritter.tx')
  withMap(`<object id="2" template="${template}" x="100" y="100"><properties><property name="level" type="int" value="4"/></properties></object>`,file=>{const m=readWorld(file).objects[0];assert.equal(m.enemy,'ritter');assert.equal(m.level,4)})
})
test('invalid enemy kind, noninteger level and invalid HP are rejected',()=>{
  for(const [name,value] of [['enemy','dragon'],['level','1.5'],['hp','NaN']])withMap(`<object id="2" class="monster" x="100" y="100"><properties><property name="${name}" value="${value}"/></properties></object>`,file=>assert.throws(()=>readWorld(file)))
})
test('duplicate starts, duplicate ids and out-of-bounds objects are rejected',()=>{
  withMap('<object id="2" class="start" x="40" y="50"><point/></object>',file=>assert.throws(()=>readWorld(file),/nur ein Startpunkt/))
  withMap('<object id="2" class="npc" x="40" y="50"/><object id="2" class="monster" x="80" y="50"/>',file=>assert.throws(()=>readWorld(file),/doppelte/))
  withMap('<object id="2" class="npc" x="900" y="50"/>',file=>assert.throws(()=>readWorld(file)))
})
test('external templates and infinite maps are rejected',()=>{
  withMap('<object id="2" template="/private/tmp/not-a-nobby-template.tx" x="100" y="100"/>',file=>assert.throws(()=>readWorld(file),/außerhalb/))
  withMap('',file=>assert.throws(()=>readWorld(file),/endliche/),'infinite="1"')
})
test('rectangular start objects are rejected because the native engine requires a point',()=>{
  withMap('',file=>{
    fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('<point/>',''))
    assert.throws(()=>readWorld(file),/Punktobjekt/)
  })
})
