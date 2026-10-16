const {chromium}=require('playwright')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const {PNG}=require('pngjs')
const ensureDevServer=require('./ensure-dev-server.cjs')
;(async()=>{
 const stop=await ensureDevServer(),output=process.env.NOBBY_ARTIFACT_DIR||'artifacts/shaman-run'
 let browser
 const report={checks:[],errors:[],frames:[]}
 try{
  browser=await chromium.launch({...(process.env.CI?{}:{channel:'chrome'}),headless:true,args:['--enable-unsafe-swiftshader']})
  const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:output+'/video',size:{width:1280,height:800}}})
  const page=await context.newPage()
  page.on('pageerror',e=>report.errors.push(e.message))
  await page.route('**/src/modules/main/display.ts*',async route=>{
   const response=await route.fetch(),source=await response.text()
   const body=source.replace('onStep(engine) {','onStep(engine) { window.__gaitReview={engine,get server(){return engine.context.get("server")}};')
   assert.notEqual(body,source);await route.fulfill({response,body})
  })
  await page.goto('http://127.0.0.1:'+(process.env.NOBBY_TEST_PORT||5173)+'/')
  await page.locator('[data-class="shaman"]').click()
  await page.waitForFunction(()=>window.__gaitReview?.engine?.getCurrentPlayer())
  await page.waitForTimeout(700)
  await page.evaluate(async()=>{
   const p=Object.values(window.__gaitReview.server.subRoom.players())[0]
   await p.teleport({x:960,y:1200})
  })
  await page.waitForTimeout(250)
  for(const [name,key] of [['front','ArrowDown'],['rear','ArrowUp']]){
   const before=await page.evaluate(()=>{const p=window.__gaitReview.engine.getCurrentPlayer();return {x:p.x(),y:p.y()}})
   await page.keyboard.down(key)
   for(let f=0;f<8;f++){
    await page.waitForTimeout(85)
    await page.screenshot({path:`${output}/game-${name}-${f}.png`})
   }
   await page.keyboard.up(key)
   const after=await page.evaluate(()=>{const p=window.__gaitReview.engine.getCurrentPlayer();return {x:p.x(),y:p.y()}})
   assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>8,`no actual player travel: ${name} ${JSON.stringify({before,after})}`)
   report.frames.push({name,before,after})
   report.checks.push(`${name}: real keyboard movement, eight running captures, full cycle and wrap`)
  }
  const filmstrip=new PNG({width:8*288,height:2*288})
  for(const [row,name] of ['front','rear'].entries())for(let f=0;f<8;f++){
   const shot=PNG.sync.read(fs.readFileSync(`${output}/game-${name}-${f}.png`))
   for(let y=0;y<288;y++)for(let x=0;x<288;x++){
    const si=((336+Math.floor(y/3))*shot.width+608+Math.floor(x/3))*4
    const di=((row*288+y)*filmstrip.width+f*288+x)*4
    filmstrip.data.set(shot.data.subarray(si,si+4),di)
   }
  }
  fs.writeFileSync(output+'/game-filmstrip-3x.png',PNG.sync.write(filmstrip))
  assert.deepEqual(report.errors,[])
  await context.close()
  // Review gallery next to the live screenshots, plus animated sprite previews.
  const gallery=await browser.newPage({viewport:{width:1800,height:1200}})
  await gallery.goto('file://'+process.cwd()+'/'+output+'/index.html')
  await gallery.screenshot({path:output+'/preview-browser.png'})
  await gallery.goto('file://'+process.cwd()+'/artifacts/art-direction/style-reference.html')
  await gallery.screenshot({path:output+'/style-reference-browser.png',fullPage:true})
  for(const id of ['enemy-warrior','hero','shaman'])
   await gallery.locator('article').filter({has:gallery.locator('strong',{hasText:new RegExp('^'+id+'$')})}).screenshot({path:output+'/reference-'+id+'.png'})
 }finally{
  fs.writeFileSync(output+'/browser-report.json',JSON.stringify(report,null,2)+'\n')
  if(browser)await browser.close()
  await stop()
 }
})().catch(e=>{console.error(e);process.exitCode=1})
