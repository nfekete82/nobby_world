import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {editorWrite} from '../scripts/web-editor-api.mjs'

test('editor rejects traversal, unknown maps, malformed TMX, and conflicting Tiled changes without writing files',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nobby-editor-test-'))
 try{
  const maps=path.join(dir,'src/tiled');fs.mkdirSync(maps,{recursive:true})
  const first='<?xml version="1.0" encoding="UTF-8"?>\n<map id="fake"></map>\n'
  const file=path.join(maps,'simplemap.tmx');fs.writeFileSync(file,first)
  assert.equal(editorWrite({id:'../other',original:first,updated:first},dir).status,400)
  assert.equal(editorWrite({id:'unknown',original:first,updated:first},dir).status,404)
  assert.equal(editorWrite({id:'simplemap',original:'outdated',updated:first},dir).status,409)
  assert.equal(editorWrite({id:'simplemap',original:first,updated:'<!DOCTYPE foo><map></map>'},dir).status,400)
  assert.equal(editorWrite({id:'simplemap',original:first,updated:'<map></map>'},dir).status,400)
  assert.equal(editorWrite({id:'simplemap',original:first,updated:first},dir).status,200)
  assert.equal(fs.readFileSync(file,'utf8'),first)
  assert.ok(!fs.existsSync(path.join(dir,'art')),'do not back up or rewrite an unchanged map')
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})

test('web editor is linked from the native Escape GUI and has reversible editing controls',()=>{
 const ui=fs.readFileSync('src/ui/web-editor.ts','utf8')
 const css=fs.readFileSync('src/ui/web-editor.css','utf8')
 const hud=fs.readFileSync('src/ui/hud.ts','utf8')
 const vite=fs.readFileSync('vite.config.ts','utf8')
 assert.match(hud,/ensureEditorMenu\(engine\)/)
 assert.match(ui,/menu\.append\(button\('🗺 Karteneditor'/)
 assert.match(ui,/Kacheln/)
 assert.match(ui,/new XMLSerializer\(\)/)
 assert.match(ui,/Rückgängig/)
 assert.match(ui,/TMX exportieren/)
 assert.match(ui,/Gespeichert/)
 assert.match(ui,/X-Nobby-Editor/)
 assert.match(css,/z-index:11000/)
 assert.match(vite,/server\.middlewares\.use\(editorApi\)/)
})
