const {chromium}=require('playwright')
const assert=require('node:assert/strict')
const ensureDevServer=require('./ensure-dev-server.cjs')

;(async()=>{
 const stop=await ensureDevServer()
 let browser
 try{
  browser=await chromium.launch({...(process.env.CI?{}:{channel:'chrome'}),
   headless:true,args:['--enable-unsafe-swiftshader']})
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1400,height:900}})
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('dialog',d=>void d.accept())
  await page.goto('http://127.0.0.1:5173/')
  await page.waitForSelector('#nobby-hud:not([hidden])',{timeout:20000})
  // Give the standalone game focus before dispatching the same Escape
  // action a player uses. Some headless Chrome runs begin without canvas focus.
  await page.locator('#rpg canvas').first().click({position:{x:20,y:20}})
  await page.keyboard.press('Escape',{delay:160})
  const menu=page.locator('.rpg-ui-main-menu-layout')
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
  await editor.waitFor()
  const stage=editor.locator('canvas.we-map')
  await page.waitForFunction(()=>document.querySelector('.we-map')?.width===2560,{},{timeout:10000})
  assert.equal(await stage.evaluate(e=>e.height),2048)
  assert.equal(await page.locator('.we-palette').isVisible(),false,'tile palette initially hidden')
  await editor.getByRole('button',{name:'🖌 Kacheln'}).click()
  await page.waitForFunction(()=>document.querySelectorAll('.we-palette .we-tile').length>0)
  await editor.getByRole('button',{name:'↖ Objekte'}).click()
  await editor.getByRole('button',{name:'🌲 Platzieren'}).click()
  const gallery=editor.locator('.we-object-gallery .we-object-card')
  await page.waitForFunction(()=>document.querySelectorAll('.we-object-card').length>=8)
  assert.ok((await gallery.count())>=8,'visual object preview should list the available sprites')
  await editor.getByRole('searchbox',{name:'Objekte suchen'}).fill('tree')
  assert.ok((await gallery.filter({visible:true}).count())>=2,'object thumbnails should be searchable')
  await editor.getByRole('searchbox',{name:'Objekte suchen'}).fill('')
  await gallery.first().click()
  assert.ok(await editor.locator('[data-tool="object"]').evaluate(el=>el.classList.contains('we-active')),
   'choosing an object from the gallery should enable placement')
  const firstPlace=await stage.boundingBox()
  await page.mouse.click(firstPlace.x+firstPlace.width*.55,firstPlace.y+firstPlace.height*.55)
  assert.ok(await editor.locator('[data-tool="object"]').evaluate(el=>el.classList.contains('we-active')),
   'placement must stay active after adding an object')
  await editor.getByRole('button',{name:'▣ Karte erweitern'}).click()
  const width=editor.getByLabel('Breite in Kacheln')
  const height=editor.getByLabel('Höhe in Kacheln')
  assert.equal(await width.inputValue(),'40')
  assert.equal(await height.inputValue(),'32')
  await width.fill('44')
  await height.fill('35')
  await editor.getByRole('button',{name:'Fläche erweitern'}).click()
  assert.equal(await stage.evaluate(el=>el.width),44*64,'canvas width should grow in tiles')
  assert.equal(await stage.evaluate(el=>el.height),35*64,'canvas height should grow in tiles')
  await editor.getByRole('button',{name:'↶ Rückgängig'}).click()
  assert.equal(await stage.evaluate(el=>el.width),40*64,'undo must restore previous canvas size')
  await editor.getByRole('button',{name:'↶ Rückgängig'}).click()
  assert.equal(await stage.evaluate(el=>el.height),32*64,'original map height should be preserved')
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
  await editor.getByRole('button',{name:'✕ Schließen'}).click()
  await editor.waitFor({state:'hidden'})
  assert.deepEqual(errors,[])
  console.log('In-game web editor test OK: Escape menu, canvas, tiles, props, TMX export, close.')
 }finally{
  if(browser)await browser.close()
  await stop()
 }
})().catch(e=>{console.error(e);process.exitCode=1})
