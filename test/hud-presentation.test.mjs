import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const css=fs.readFileSync('src/ui/tiny-swords.css','utf8')
const hud=fs.readFileSync('src/ui/hud.ts','utf8')
const player=fs.readFileSync('src/modules/main/player.ts','utf8')

test('status panel is bigger, has legible meters and remains responsive',()=>{
 assert.match(css,/\.nobby-status\{[^}]*width:340px/)
 assert.match(css,/\.nobby-portrait\{width:80px;height:100px/)
 assert.match(css,/\.nobby-name\{font-size:18px/)
 assert.match(css,/\.nobby-meter\{[^}]*height:24px/)
 assert.match(css,/\.nobby-meter span\{[^}]*font-size:12px/)
 assert.match(css,/width:min\(260px,calc\(100vw - 80px\)\)/)
 assert.match(hud,/const portraitScale=1\.25/)
})

test('the playable character name is lowercase in HUD, server, maps and screenshots',()=>{
 assert.match(player,/player\.name = 'nobby'/)
 assert.match(hud,/title\.textContent=`nobby · Stufe/)
 for(const path of ['src/tiled/simplemap.tmx','src/tiled/wald.tmx','src/generated/worlds.json']){
  const content=fs.readFileSync(path,'utf8')
  assert.match(content,/Willkommen, nobby!/,path)
  assert.doesNotMatch(content,/Willkommen, Nobby!/,path)
 }
 for(const path of ['scripts/browser-review.cjs','scripts/art-review.cjs']){
  const content=fs.readFileSync(path,'utf8')
  assert.match(content,/getByText\('nobby',\{exact:true\}\)/,path)
 }
})
