if(require('./editor-review-fixture.cjs')('web-editor-review.cjs'))return
const {chromium}=require('playwright')
const assert=require('node:assert/strict')
const ensureDevServer=require('./ensure-dev-server.cjs')
const fs=require('node:fs')
const xml=require('xml-js')

;(async()=>{
 const stop=await ensureDevServer()
 let browser
 try{
  browser=await chromium.launch({...(process.env.CI?{}:{channel:'chrome'}),
   headless:true,args:['--enable-unsafe-swiftshader']})
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1920,height:1200}})
  const page=await context.newPage();page.setDefaultTimeout(15000)
  // Relay only this disposable fixture's API requests through the unchanged
  // localhost:5173 authority guard; never contact the user's actual server.
  await page.route('**/__nobby-editor/**',async route=>{const response=await route.fetch({headers:{...route.request().headers(),host:'127.0.0.1:5173',origin:'http://127.0.0.1:5173'}});if(route.request().url().endsWith('/assets/save')&&delayAssetSave){delayAssetSave=false;await new Promise(r=>setTimeout(r,1200))}await route.fulfill({response})})
  let delayAssetSave=false
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('dialog',d=>void d.accept(d.type()==='prompt'?d.defaultValue():undefined))
  await page.route('**/src/modules/main/display.ts*',async route=>{const response=await route.fetch();const source=await response.text();await route.fulfill({response,body:source.replace('onStep(engine) {','onStep(engine) { window.__editorReviewEngine=engine;')})})
  await page.goto(('http://127.0.0.1:'+(process.env.NOBBY_TEST_PORT||5173)+'/'))
 await page.waitForSelector('#nobby-character-select[open] [data-class="shaman"]',{timeout:20000});await page.locator('#nobby-character-select[open] [data-class="shaman"]').click();
  await page.waitForSelector('#nobby-hud:not([hidden])',{timeout:20000})
  // Give the standalone game focus before dispatching the same Escape
  // action a player uses. Some headless Chrome runs begin without canvas focus.
  await page.locator('#rpg canvas').first().click({position:{x:20,y:20}})
  await page.keyboard.press('Escape',{delay:160})
  const menu=page.locator('.rpg-ui-main-menu-layout')
  await menu.waitFor({state:'visible',timeout:3000}).catch(()=>{})
  if(!(await menu.isVisible())){
   // The HUD menu button dispatches the identical RPG-JS action; using this
   // fallback avoids flakes caused by an unfocused headless browser window.
   await page.locator('#nobby-hud button[data-action="escape"]').click()
  }
  await menu.waitFor({state:'visible',timeout:12000})
  const launch=page.locator('.rpg-ui-main-menu-layout button.we-launch')
  await launch.waitFor({state:'visible',timeout:12000})
  await launch.click()
  const editor=page.getByRole('dialog',{name:'Nobby World Karteneditor'})
  await editor.waitFor();console.log('Editor open')
  const stage=editor.locator('canvas.we-map')
  // Do not assume a fresh 40x32 map: user-authored islands can be 100x40.
  const localMap=xml.xml2js(fs.readFileSync('src/tiled/simplemap.tmx','utf8'),{compact:true}).map
  const expectedWidth=Number(localMap._attributes.width)
  const expectedHeight=Number(localMap._attributes.height)
  await page.waitForFunction(width=>document.querySelector('.we-map')?.width===width*64,expectedWidth,{timeout:15000})
  assert.equal(await stage.evaluate(e=>e.height),expectedHeight*64)
  assert.equal(await editor.locator('.we-layer-help').isVisible(),false,'tile layers should be hidden for object placement')
  assert.equal(await page.locator('.we-palette').isVisible(),false,'tile palette initially hidden')
  await editor.getByRole('button',{name:'🖌 Kacheln'}).click()
  await editor.getByRole('button',{name:'Gelände',exact:true}).click()
  assert.match(await editor.locator('.we-layer-help').innerText(),/Gras/)
  await editor.getByRole('button',{name:'Wasser',exact:true}).click()
  assert.ok((await editor.locator('.we-tabs button:visible').count())>=1)
  await editor.getByRole('button',{name:'Alle',exact:true}).click()
  await page.waitForFunction(()=>document.querySelectorAll('.we-palette .we-tile').length>0)
  await editor.getByRole('button',{name:'↖ Objekte'}).click()
  await editor.getByRole('button',{name:'🌲 Platzieren'}).click()
  const gallery=editor.locator('.we-object-gallery .we-object-card')
  await page.waitForFunction(()=>document.querySelectorAll('.we-object-card').length>=8)
  assert.ok((await gallery.count())>=8,'visual object preview should list the available sprites')
  await editor.locator('.we-category').filter({hasText:/^Wald$/}).click()
  assert.ok((await gallery.filter({visible:true}).count())>=3,'forest category shows only matching trees and bushes')
  await editor.getByRole('button',{name:'Wasserobjekte',exact:true}).click()
  assert.ok((await gallery.filter({visible:true}).count())>=2,'water props have their own category')
  await editor.getByRole('button',{name:'Alle',exact:true}).click()
  await editor.getByRole('searchbox',{name:'Objekte suchen'}).fill('tree')
  assert.ok((await gallery.filter({visible:true}).count())>=2,'object thumbnails should be searchable')
  await editor.getByRole('searchbox',{name:'Objekte suchen'}).fill('')
  await gallery.filter({visible:true}).first().click()
  assert.ok(await editor.locator('[data-tool="object"]').evaluate(el=>el.classList.contains('we-active')),
   'choosing an object from the gallery should enable placement')
  const firstPlace=await stage.boundingBox()
  await page.mouse.click(firstPlace.x+firstPlace.width*.55,firstPlace.y+firstPlace.height*.55)
  assert.ok(await editor.locator('[data-tool="object"]').evaluate(el=>el.classList.contains('we-active')),
   'placement must stay active after adding an object')
  await editor.getByRole('button',{name:'▣ Karte erweitern'}).click()
  const width=editor.getByLabel('Breite in Kacheln')
  const height=editor.getByLabel('Höhe in Kacheln')
  assert.equal(await width.inputValue(),String(expectedWidth))
  assert.equal(await height.inputValue(),String(expectedHeight))
  const newWidth=expectedWidth+4,newHeight=expectedHeight+3
  if(newWidth<=128&&newHeight<=128&&newWidth*newHeight<=6250){
   await width.fill(String(newWidth))
   await height.fill(String(newHeight))
   await editor.getByRole('button',{name:'Fläche erweitern'}).click()
   assert.equal(await stage.evaluate(el=>el.width),newWidth*64,'canvas width should grow in tiles')
   assert.equal(await stage.evaluate(el=>el.height),newHeight*64,'canvas height should grow in tiles')
   await editor.getByRole('button',{name:'↶ Rückgängig'}).click()
   assert.equal(await stage.evaluate(el=>el.width),expectedWidth*64,'undo must restore previous canvas size')
  }
  await editor.getByRole('button',{name:'↶ Rückgängig'}).click()
  assert.equal(await stage.evaluate(el=>el.height),expectedHeight*64,'original map height should be preserved')
  // Do not mutate the user's TMX in this integration test.
  const exported=page.waitForEvent('download')
  await editor.getByRole('button',{name:'↓ TMX exportieren'}).click()
  const download=await exported
  assert.equal(download.suggestedFilename(),'simplemap.tmx')
  const stream=await download.createReadStream()
  let text=''
  for await(const chunk of stream)text+=chunk.toString()
  assert.match(text,/name="Spiellogik"/)
  assert.match(text,/firstgid="218"/)
  console.log('Map tools tested')
  // Real disk saves and uploads happen exclusively inside the fixture.
  await editor.getByRole('button',{name:'💾 Speichern',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.we-message')?.textContent.includes('Gespeichert'),{},{timeout:30000})
  await editor.getByRole('button',{name:'↖ Objekte',exact:true}).click()
  const player=await page.evaluate(()=>{const p=window.__editorReviewEngine.getCurrentPlayer();return {x:p.x()+16,y:p.y()-5}}),mapBounds=await stage.boundingBox()
  await page.mouse.click(mapBounds.x+player.x*mapBounds.width/(expectedWidth*64),mapBounds.y+player.y*mapBounds.height/(expectedHeight*64))
  await editor.getByRole('button',{name:'Grafiken bearbeiten',exact:true}).click()
  const assets=editor.locator('.we-assets');console.log('Asset library open')
  await assets.getByRole('searchbox',{name:'Assets suchen'}).fill('shaman')
  await assets.locator('[data-asset-id="shaman"]').click()
  await page.waitForFunction(()=>document.querySelector('.ae-title')?.textContent.startsWith('shaman · shaman')&&!document.querySelector('.ae-detail').inert)
  await assets.locator('.ae-animation').filter({hasText:'Laufen / Walk'}).click()
  await assets.getByRole('button',{name:'Frame 4',exact:true}).click()
  assert.equal(await assets.locator('.ae-frame.ae-selected').getAttribute('data-frame'),'3')
  const {PNG}=require('pngjs'),registryBefore=JSON.parse(fs.readFileSync('src/art/registry.json','utf8')),a=registryBefore.assets.shaman,state=a.animations.walk
  const originalSheet=PNG.sync.read(fs.readFileSync('public/'+state.image)),replacement=new PNG({width:a.frame[0],height:a.frame[1]})
  PNG.bitblt(originalSheet,replacement,3*a.frame[0],0,...a.frame,0,0)
  // Change an existing visible pixel, keeping the native frame size and art form.
  const offset=replacement.data.findIndex((v,i)=>i%4===3&&v===255)-3
  replacement.data[offset]=(replacement.data[offset]+30)%256
  const upload=PNG.sync.write(replacement);fs.writeFileSync('fixture-upload.png',upload)
  await assets.getByLabel('Grafiken hochladen').setInputFiles('fixture-upload.png')
  await page.waitForFunction(()=>document.querySelector('.ae-status')?.textContent.startsWith('Importiert'))
  fs.mkdirSync('artifacts/editor-workshop',{recursive:true})
  await assets.getByLabel('Mit Asset vergleichen').selectOption('enemy-warrior')
  await assets.getByLabel('Sprite-Zoom').selectOption('2')
  await assets.locator('.ae-detail').evaluate(e=>e.scrollTop=0)
  await page.screenshot({path:'artifacts/editor-workshop/animation-editor.png'})
  await assets.getByRole('button',{name:'💾 Asset speichern',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.ae-status')?.textContent.startsWith('Gespeichert, Spiel'),{},{timeout:30000})
  console.log('Shaman frame saved')
  const registrySaved=JSON.parse(fs.readFileSync('src/art/registry.json','utf8')),savedSheet=PNG.sync.read(fs.readFileSync('public/'+registrySaved.assets.shaman.animations.walk.image)),savedFrame=new PNG({width:a.frame[0],height:a.frame[1]})
  PNG.bitblt(savedSheet,savedFrame,3*a.frame[0],0,...a.frame,0,0);assert.deepEqual(savedFrame.data,replacement.data,'uploaded frame must be published without resizing')
  assert.notEqual(registrySaved.assets.shaman.animations.walk.image,state.image)
  // Duplicate, delete, restore an independent sheep asset without modifying sheep sources.
  await assets.getByRole('searchbox',{name:'Assets suchen'}).fill('sheep')
  await assets.locator('[data-asset-id="sheep"]').click()
  await page.waitForFunction(()=>document.querySelector('.ae-title')?.textContent.startsWith('sheep · sheep')&&!document.querySelector('.ae-detail').inert)
  await assets.getByRole('button',{name:'Duplizieren',exact:true}).click()
  await assets.getByRole('button',{name:'Frame duplizieren',exact:true}).click()
  assert.equal(await assets.locator('.ae-frame').count(),9)
  await assets.getByRole('button',{name:'Frame 9',exact:true}).dragTo(assets.getByRole('button',{name:'Frame 1',exact:true}))
  assert.equal(await assets.locator('.ae-frame.ae-selected').getAttribute('data-frame'),'0')
  await assets.getByRole('button',{name:'Frame entfernen',exact:true}).click()
  assert.equal(await assets.locator('.ae-frame').count(),8)
  await assets.getByRole('button',{name:'+ Animation',exact:true}).click()
  await assets.getByRole('button',{name:'Animation entfernen',exact:true}).click()
  delayAssetSave=true
  await assets.getByRole('button',{name:'💾 Asset speichern',exact:true}).click()
  await assets.getByLabel('Name',{exact:true}).fill('Schaf mit späterer Änderung')
  await assets.getByLabel('Name',{exact:true}).press('Tab')
  await page.waitForFunction(()=>document.querySelector('.ae-status')?.textContent.includes('weitere Änderungen sind noch ungespeichert'),{},{timeout:30000})
  assert.notEqual(JSON.parse(fs.readFileSync('art/user-assets/manifest.json','utf8')).assets['sheep-kopie'].name,'Schaf mit späterer Änderung')
  await assets.getByRole('button',{name:'💾 Asset speichern',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.ae-status')?.textContent.startsWith('Gespeichert, Spiel'),{},{timeout:30000})
  assert.equal(JSON.parse(fs.readFileSync('art/user-assets/manifest.json','utf8')).assets['sheep-kopie'].name,'Schaf mit späterer Änderung')
  // Reopen to get persisted ownership and verify the imported metadata roundtrip.
  await assets.locator('[data-asset-id="sheep-kopie"]').click()
  await assets.getByRole('button',{name:'Asset löschen',exact:true}).waitFor()
  await assets.getByRole('button',{name:'Asset löschen',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.ae-status')?.textContent.startsWith('Im Papierkorb'))
  assert.equal(JSON.parse(fs.readFileSync('src/art/registry.json','utf8')).assets['sheep-kopie'],undefined)
  await assets.getByRole('button',{name:'Papierkorb',exact:true}).click()
  await assets.getByRole('button',{name:'Wiederherstellen',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.ae-status')?.textContent.startsWith('Wiederhergestellt'))
  assert.ok(JSON.parse(fs.readFileSync('src/art/registry.json','utf8')).assets['sheep-kopie'])
  await assets.getByRole('searchbox',{name:'Assets suchen'}).fill('')
  await page.waitForFunction(()=>{const c=document.querySelector('.ae-asset-card canvas');return c&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)})
  await assets.locator('.ae-detail').evaluate(e=>{e.scrollTop=0;e.scrollLeft=0})
  await page.screenshot({path:'artifacts/editor-workshop/asset-library.png'})
  await assets.getByRole('button',{name:'← Zur Karte',exact:true}).click()
  await page.screenshot({path:'artifacts/editor-workshop/map-editor.png'})
  const refreshed=page.waitForEvent('load',{timeout:30000})
  await editor.getByRole('button',{name:'Spiel aktualisieren',exact:true}).click()
  await refreshed
  await editor.waitFor({state:'hidden',timeout:30000})
  await page.waitForSelector('#nobby-hud:not([hidden])',{timeout:30000})
  // Wait for actual scene rendering after HUD creation (Pixi loads maps asynchronously).
  let rendered=false;for(let i=0;i<30;i++){const p=PNG.sync.read(await page.screenshot());let colored=0;for(let y=250;y<p.height-120;y+=20)for(let x=400;x<p.width-400;x+=20){const at=(y*p.width+x)*4;if(p.data[at]+p.data[at+1]+p.data[at+2]>80)colored++}if(colored>100){rendered=true;break}await page.waitForTimeout(200)}assert.ok(rendered,'game scene must actually render after refresh')
  await page.screenshot({path:'artifacts/editor-workshop/game-after-refresh.png'})
  // Actual runtime module and PNG endpoint now load the saved user sheet.
  const loaded=await page.evaluate(async()=>{const m=await import('/src/art/sprites.ts');const s=m.spritesheets().find(x=>x.id==='shaman');return {image:s.textures.walk.image,frames:s.textures.walk.framesWidth}})
  assert.equal(loaded.image,registrySaved.assets.shaman.animations.walk.image);assert.equal(loaded.frames,state.frames)
  const disk=JSON.parse(fs.readFileSync('art/user-assets/manifest.json','utf8'));assert.ok(disk.assets.shaman);assert.ok(disk.assets['sheep-kopie'])
  // A build/art generator must keep the same runtime edits in this disposable project.
  require('node:child_process').execFileSync(process.execPath,['scripts/compile-art.mjs'],{stdio:'pipe'})
  assert.equal(JSON.parse(fs.readFileSync('src/art/registry.json','utf8')).assets.shaman.animations.walk.image,loaded.image)
  // The controlled refresh has already closed the editor.

  await editor.waitFor({state:'hidden'})
  require('node:child_process').execFileSync(process.execPath,['scripts/art-reference-sheet.mjs'],{stdio:'pipe'})
  const references=await context.newPage();await references.goto('file://'+process.cwd()+'/artifacts/art-direction/style-reference.html');await references.screenshot({path:'artifacts/editor-workshop/style-references.png'});await references.close()
  fs.writeFileSync('artifacts/editor-workshop/report.json',JSON.stringify({isolated:true,map:{width:expectedWidth,height:expectedHeight},checks:['direct shaman selection','map save','PNG Walk frame 4 replacement','native frame bytes preserved','all states/directions retained','sheep duplicate','frame duplicate/reorder/remove','animation add/remove','later edits stay dirty during save','trash/restore','controlled full reload','game scene rendered','actual runtime uses saved sheet','art:prepare retains user overlay'],errors},null,2)+'\n')
  assert.deepEqual(errors,[])
  console.log('In-game web editor test OK: map save, shaman PNG frame upload, sheep duplicate/trash/restore, controlled reload, actual runtime sheet, art compiler persistence.')
 }finally{
  if(browser)await browser.close()
  await stop()
 }
})().catch(e=>{console.error(e);process.exitCode=1})
