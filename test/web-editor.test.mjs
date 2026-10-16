import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {editorWrite} from '../scripts/web-editor-api.mjs'

test('editor rejects traversal, unknown maps, malformed TMX, and conflicting Tiled changes without writing files',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nobby-editor-test-'))
 try{
  const maps=path.join(dir,'src/tiled');fs.mkdirSync(maps,{recursive:true})
  const first='<?xml version="1.0" encoding="UTF-8"?>\n<map width="2" height="2"><layer name="Wassergrund" width="2" height="2"><data encoding="csv">73,73,73,73</data></layer></map>\n'
  const file=path.join(maps,'simplemap.tmx');fs.writeFileSync(file,first)
  assert.equal((await editorWrite({id:'../other',original:first,updated:first},dir)).status,400)
  assert.equal((await editorWrite({id:'unknown',original:first,updated:first},dir)).status,404)
  assert.equal((await editorWrite({id:'simplemap',original:'outdated',updated:first},dir)).status,409)
  assert.equal((await editorWrite({id:'simplemap',original:first,updated:'<!DOCTYPE foo><map></map>'},dir)).status,400)
  assert.equal((await editorWrite({id:'simplemap',original:first,updated:'<map></map>'},dir)).status,400)
  assert.equal((await editorWrite({id:'simplemap',original:first,updated:first},dir)).status,200)
  assert.equal(fs.readFileSync(file,'utf8'),first)
  assert.ok(!fs.existsSync(path.join(dir,'art/map-backups')),'do not back up or rewrite an unchanged map')
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
 assert.match(fs.readFileSync('src/ui/editor-client.mjs','utf8'),/X-Nobby-Editor/)
 assert.match(css,/z-index:11000/)
 assert.match(vite,/server\.middlewares\.use\(editorApi\)/)
})

test('a managed save cannot forcibly reload the page before its response',()=>{
 const vite=fs.readFileSync('vite.config.ts','utf8')
 const api=fs.readFileSync('scripts/web-editor-api.mjs','utf8')
 assert.match(vite,/ignoreEditorFileChange\(file\)/)
 assert.match(vite,/handleHotUpdate/)
 assert.match(fs.readFileSync('scripts/editor-validate-worker.mjs','utf8'),/writeOutput:false/)
 assert.match(api,/needsRefresh:true/)
 assert.match(api,/route==='refresh'/)
})

test('resized maps are validated, saved, verified and rolled back transactionally',async()=>{
 const {validateEditorMap}=await import('../scripts/web-editor-api.mjs')
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nobby-editor-resize-'))
 const layer=(name,w,h,ids)=>`<layer name="${name}" width="${w}" height="${h}"><data encoding="csv">${ids.join(',')}</data></layer>`
 const xml=(w,h,bg,collision)=>`<?xml version="1.0" encoding="UTF-8"?>\n<map width="${w}" height="${h}">${layer('Wassergrund',w,h,bg)}${layer('Wasser und Klippen · Kollision',w,h,collision)}</map>\n`
 try{
  const folder=path.join(dir,'src/tiled');fs.mkdirSync(folder,{recursive:true})
  const file=path.join(folder,'simplemap.tmx')
  const original=xml(2,2,[73,73,73,73],[0,0,0,1])
  const updated=xml(3,3,new Array(9).fill(73),[0,0,1,0,1,1,1,1,1])
  fs.writeFileSync(file,original)
  let checks=0
  const saved=(await editorWrite({id:'simplemap',original,updated},dir,{compile:()=>{checks++}}))
  assert.equal(saved.status,200,JSON.stringify(saved.body))
  assert.equal(saved.body.needsRefresh,true);assert.equal(saved.body.width,3);assert.equal(saved.body.height,3)
  assert.equal(checks,1)
  assert.equal(fs.readFileSync(file,'utf8'),updated)
  assert.deepEqual(validateEditorMap(original,updated),{width:3,height:3,layers:2})
  assert.equal((await editorWrite({id:'simplemap',original,updated},dir)).status,409,'stale client never overwrites current map')
  const broken=xml(4,4,[73,73],[0,1])
  assert.equal((await editorWrite({id:'simplemap',original:updated,updated:broken},dir)).status,400)
  assert.equal(fs.readFileSync(file,'utf8'),updated)
  const next=xml(4,4,new Array(16).fill(73),new Array(16).fill(1))
  const bad=(await editorWrite({id:'simplemap',original:updated,updated:next},dir,{compile:()=>{throw Error('navigation failed')}}))
  assert.equal(bad.status,422)
  assert.match(bad.body.error,/navigation failed/)
  assert.equal(fs.readFileSync(file,'utf8'),updated,'failed save restores last valid map')
  assert.ok(fs.readdirSync(path.join(dir,'art/map-backups')).length>=1)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
test('editor exposes category tabs, readable layer help and deferred refresh',()=>{
 const ui=fs.readFileSync('src/ui/web-editor.ts','utf8')
 const css=fs.readFileSync('src/ui/web-editor.css','utf8')
 const vite=fs.readFileSync('vite.config.ts','utf8')
 const api=fs.readFileSync('scripts/web-editor-api.mjs','utf8')
 assert.match(ui,/private renderCategories\(\)/)
 assert.match(ui,/private filterTilesets\(\)/)
 assert.match(ui,/layerLabel\(l.name\)/)
 assert.match(ui,/layerHelp\(layer.name\)/)
 assert.match(ui,/refreshAfterClose\(\)/)
 assert.match(ui,/pendingRefresh/)
 assert.match(css,/\.we-categories/)
 assert.match(vite,/handleHotUpdate/)
 assert.match(vite,/ignoreEditorFileChange/)
 assert.match(fs.readFileSync('scripts/editor-validate-worker.mjs','utf8'),/writeOutput:false/)
 assert.match(api,/needsRefresh:true/)
})

test('Vite 8 suppresses managed map HMR while the editor save is in flight',()=>{
 const vite=fs.readFileSync('vite.config.ts','utf8')
 assert.match(vite,/hotUpdate\(ctx\) \{[\s\S]*?ignoreEditorFileChange\(ctx\.file\)/)
 assert.match(vite,/handleHotUpdate\(ctx\) \{[\s\S]*?ignoreEditorFileChange\(ctx\.file\)/)
})

test('save roundtrip on the real authored map dimensions, without changing user files',async()=>{
 const {validateEditorMap}=await import('../scripts/web-editor-api.mjs')
 const {default:xml}=await import('xml-js')
 const original=fs.readFileSync('src/tiled/simplemap.tmx','utf8')
 const map=xml.xml2js(original,{compact:true}).map
 const width=Number(map._attributes.width),height=Number(map._attributes.height)
 assert.ok(width*height>0&&width*height<=6250)
 const layers=Array.isArray(map.layer)?map.layer:[map.layer]
 assert.ok(layers.length>=6,'actual scene must retain its game layers')
 const desert=layers.find(layer=>layer._attributes.name==='Wüste')
 assert.ok(desert,'new layered desert tile exists')
 const sourceCells=String(desert.data._text).trim().split(/\s*,\s*/)
 const before=sourceCells[0]
 sourceCells[0]=before==='228'?'229':'228'
 desert.data._text='\n'+Array.from({length:height},(_,y)=>sourceCells.slice(y*width,(y+1)*width).join(',')).join(',\n')+'\n'
 const updated=xml.js2xml({map},{compact:true})
 const edited='<?xml version="1.0" encoding="UTF-8"?>\n'+updated+'\n'
 assert.deepEqual(validateEditorMap(original,edited),{width,height,layers:layers.length})
 const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'nobby-editor-full-map-'))
 try{
  const dest=path.join(tempDir,'src','tiled')
  fs.mkdirSync(dest,{recursive:true})
  fs.writeFileSync(path.join(dest,'simplemap.tmx'),original)
  let verified=0
  const compile=()=>{verified++;validateEditorMap(original,fs.readFileSync(path.join(dest,'simplemap.tmx'),'utf8'))}
  const first=(await editorWrite({id:'simplemap',original,updated:edited},tempDir,{compile}))
  assert.equal(first.status,200,JSON.stringify(first.body))
  assert.equal(verified,1)
  assert.equal(first.body.width,width)
  assert.equal(first.body.height,height)
  assert.equal(fs.readFileSync(path.join(dest,'simplemap.tmx'),'utf8'),edited)
  assert.equal((await editorWrite({id:'simplemap',original:edited,updated:edited},tempDir,{compile})).body.unchanged,true)
  assert.equal(verified,1,'no recompilation when saved document is identical')
  assert.ok(fs.readdirSync(path.join(tempDir,'art','map-backups')).length>0)
 }finally{fs.rmSync(tempDir,{recursive:true,force:true})}
})
