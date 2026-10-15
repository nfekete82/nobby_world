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
  await page.keyboard.press('Escape',{delay:120})
  const launch=page.getByRole('button',{name:'🗺 Karteneditor'})
  await launch.waitFor({timeout:6000})
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
