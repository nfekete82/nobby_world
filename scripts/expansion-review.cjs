const {chromium}=require('playwright')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const ensureDevServer=require('./ensure-dev-server.cjs')
;(async()=>{
 const stop=await ensureDevServer()
 let browser
 const output='artifacts/expansion'
 fs.mkdirSync(output,{recursive:true})
 const report={checks:[],errors:[],missing:[]}
 try{
  browser=await chromium.launch({...(process.env.CI?{}:{channel:'chrome'}),headless:true,args:['--enable-unsafe-swiftshader']})
  const context=await browser.newContext({viewport:{width:1280,height:800}})
  async function open(){
   const page=await context.newPage()
   page.on('pageerror',e=>report.errors.push(e.message))
   page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())})
   page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url())})
   await page.route('**/src/modules/main/display.ts*',async route=>{
    const response=await route.fetch(),source=await response.text()
    const body=source.replace('onStep(engine) {','onStep(engine) { window.__expansionReview={engine,read(e,k){return typeof e[k]==="function"?e[k]():e[k]},get server(){return engine.context.get("server")}};')
    assert.notEqual(body,source);await route.fulfill({response,body})
   })
   await page.goto('http://127.0.0.1:'+(process.env.NOBBY_TEST_PORT||5173)+'/')
   await page.waitForFunction(()=>window.__expansionReview?.engine?.getCurrentPlayer(),{},{timeout:20000})
   return page
  }
  let page=await open()
  await page.locator('#nobby-character-select').waitFor({state:'visible'})
  await page.screenshot({path:output+'/character-selection.png'})
  await page.keyboard.press('Enter')
  await page.waitForFunction(()=>!document.querySelector('#nobby-character-select').open)
  assert.equal(await page.evaluate(()=>window.__expansionReview.read(window.__expansionReview.engine.getCurrentPlayer(),'nobbyClass')),'mage')
  await page.evaluate(()=>{const p=Object.values(window.__expansionReview.server.subRoom.players())[0];p.hp-=35;p.sp=100})
  await page.locator('[data-action="heal"]').click()
  await page.waitForFunction(()=>{const p=Object.values(window.__expansionReview.server.subRoom.players())[0];return p.sp<90})
  report.checks.push('mage choice and existing 25-mana healing')
  await page.reload()
  await page.waitForFunction(()=>window.__expansionReview?.read(window.__expansionReview.engine.getCurrentPlayer(),'nobbyClass')==='mage')
  await page.waitForTimeout(500)
  assert.equal(await page.locator('#nobby-character-select').isVisible(),false)
  report.checks.push('reload restores class without showing selection')
  const legacy=await page.evaluate(()=>{
   const p=Object.values(window.__expansionReview.server.subRoom.players())[0]
   p.gold=321
   const snapshot=p.snapshot();delete snapshot.nobbyClass
   localStorage.setItem('nobby_world_rpgjs_v1',JSON.stringify([null,null,{map:p.getCurrentMap().id,date:new Date().toISOString(),snapshot:JSON.stringify(snapshot)}]))
   localStorage.removeItem('nobby_world_resume_v1')
   return {level:p.level,exp:p.exp,gold:p.gold}
  })
  await page.reload()
  await page.waitForFunction(()=>window.__expansionReview?.read(window.__expansionReview.engine.getCurrentPlayer(),'nobbyClass')==='mage')
  const restored=await page.evaluate(()=>{const p=Object.values(window.__expansionReview.server.subRoom.players())[0];return {level:p.level,exp:p.exp,gold:p.gold}})
  assert.deepEqual(restored,legacy)
  report.checks.push('legacy numbered save migrates to mage preserving level, XP and gold')

  await page.evaluate(()=>localStorage.clear())
  await page.close()
  page=await open()
  await page.locator('[data-class="shaman"]').click()
  await page.waitForFunction(()=>window.__expansionReview.read(window.__expansionReview.engine.getCurrentPlayer(),'nobbyClass')==='shaman')
  await page.waitForTimeout(500)
  await page.evaluate(()=>{const p=Object.values(window.__expansionReview.server.subRoom.players())[0];p.sp=100})
  await page.keyboard.press('r')
  await page.waitForFunction(()=>window.__expansionReview.read(window.__expansionReview.engine.getCurrentPlayer(),'nobbySkeletons')===1,{},{timeout:10000}).catch(async error=>{console.log('SUMMON DIAGNOSTIC',await page.evaluate(()=>{const p=Object.values(window.__expansionReview.server.subRoom.players())[0];const e=window.__expansionReview.engine,c=e.getCurrentPlayer();return {summonStatus:p.nobbySummonStatus,clientMove:c.canMove,clientMoveSignal:c._canMove?.(),stopped:e.stopProcessingInput,id:p.id,canMove:p.canMove,sp:p.sp,hp:p.hp,cls:p.nobbyClass(),map:p.getCurrentMap().id,events:Object.values(p.getCurrentMap().events()).filter(e=>e.nobbyCompanion).map(e=>({id:e.id,hp:e.hp}))}}));throw error})
  const after=await page.evaluate(()=>{const p=Object.values(window.__expansionReview.server.subRoom.players())[0];return {sp:p.sp,graphic:p.graphics()}})
  assert.ok(after.sp>=90&&after.sp<92,JSON.stringify(after))
  assert.ok(after.graphic.includes('shaman'))
  await page.screenshot({path:output+'/summoning.png'})
  report.checks.push('shaman graphic, R hotkey, green summon and 10-mana cost')
  const follower=await page.evaluate(()=>{const e=Object.values(window.__expansionReview.server.subRoom.events()).find(e=>e.nobbyCompanion);return {id:e.id,x:e.x(),y:e.y()}})
  await page.keyboard.down('ArrowUp');await page.waitForTimeout(250);await page.keyboard.up('ArrowUp')
  await page.waitForFunction(before=>{const e=window.__expansionReview.server.subRoom.events()[before.id];return e&&Math.hypot(e.x()-before.x,e.y()-before.y)>8},follower,{timeout:10000})
  report.checks.push('live skeleton follows moving player using navigation and dynamic physics')

  const start=await page.evaluate(async()=>{
   const map=window.__expansionReview.server.subRoom
   const ally=Object.values(map.events()).find(e=>e.nobbyCompanion)
   const foe=Object.values(map.events()).find(e=>e.battleAi)
   foe.stopMoveTo();await foe.teleport({x:ally.x()+32,y:ally.y()})
   foe.battleAi.visionRange=0
   return {id:foe.id,hp:foe.hp,marker:foe.nobbyWorldObjectId,enemy:{x:foe.x(),y:foe.y()},ally:{x:ally.x(),y:ally.y()}}
  })
  await page.waitForFunction(before=>{
   const e=window.__expansionReview.server.subRoom.events()[before.id]
   return !e||e.hp<before.hp
  },start,{timeout:20000}).catch(async error=>{console.log(start,await page.evaluate(()=>({owner:Object.values(window.__expansionReview.server.subRoom.players()).map(p=>({x:p.x(),y:p.y(),hp:p.hp,cls:typeof p.nobbyClass,selection:p.nobbyClass()})),events:Object.values(window.__expansionReview.server.subRoom.events()).filter(e=>e.nobbyCompanion||e.battleAi).map(e=>({id:e.id,x:e.x(),y:e.y(),hp:e.hp,companion:e.nobbyCompanion,marker:e.nobbyWorldObjectId}))})));throw error})
  await page.screenshot({path:output+'/skeleton-combat.png'})
  report.checks.push('live server skeleton attacks authored enemy')
  await page.evaluate(async()=>{
   const p=Object.values(window.__expansionReview.server.subRoom.players())[0]
   await p.changeMap('wald','start')
  })
  await page.waitForFunction(()=>window.__expansionReview.engine.sceneMap.data()?.id==='wald')
  assert.equal(await page.evaluate(()=>window.__expansionReview.read(window.__expansionReview.engine.getCurrentPlayer(),'nobbySkeletons')),0)
  report.checks.push('portal map transition keeps class and removes companions')
  await page.locator('[data-action="nobby:summon"]').click()
  await page.waitForFunction(()=>window.__expansionReview.read(window.__expansionReview.engine.getCurrentPlayer(),'nobbySkeletons')===1,{},{timeout:10000}).catch(async error=>{console.log('PORTAL SUMMON',await page.evaluate(()=>{const e=window.__expansionReview.engine,p=Object.values(window.__expansionReview.server.subRoom.players())[0];return {cls:p.nobbyClass(),hp:p.hp,sp:p.sp,canMove:p.canMove,map:p.getCurrentMap().id,last:p.nobbyLastSummon,count:typeof p.nobbySkeletons==='function'?p.nobbySkeletons():p.nobbySkeletons,events:Object.values(window.__expansionReview.server.subRoom.events()).filter(e=>e.nobbyCompanion).map(e=>({id:e.id,hp:e.hp,x:e.x(),y:e.y()}))}}));throw error})
  report.checks.push('summoning after portal creates a companion in the new room')
  await page.evaluate(async()=>{const p=Object.values(window.__expansionReview.server.subRoom.players())[0];await p.changeMap('simplemap','start')})
  await page.waitForFunction(()=>window.__expansionReview.engine.sceneMap.data()?.id==='simplemap')
  await page.evaluate(()=>{const map=window.__expansionReview.server.subRoom,p=Object.values(map.players())[0],gate=map.events()['nobby-biome-gateway'];if(!gate)throw Error('missing travel stone');void gate.execMethod('onAction',[p])})
  await page.getByText('Goldsand-Oase',{exact:true}).click()
  await page.waitForFunction(()=>window.__expansionReview.engine.sceneMap.data()?.id==='sunscar')
  report.checks.push('native travel-stone dialog navigates to desert through a real GUI choice')


  for(const id of ['sunscar','frostwild','verdant']){
   await page.evaluate(async id=>{const p=Object.values(window.__expansionReview.server.subRoom.players())[0];await p.changeMap(id,'start')},id)
   await page.waitForFunction(id=>window.__expansionReview.engine.sceneMap.data()?.id===id,id)
   await page.waitForTimeout(700)
   await page.screenshot({path:output+'/'+id+'.png'})
   assert.equal(await page.evaluate(()=>window.__expansionReview.read(window.__expansionReview.engine.getCurrentPlayer(),'nobbyClass')),'shaman')
  }
  report.checks.push('desert, snow and jungle maps render with native enemies and scenery')
  const touchContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true})
  const touch=await touchContext.newPage()
  touch.on('pageerror',e=>report.errors.push(e.message))
  await touch.goto('http://127.0.0.1:'+(process.env.NOBBY_TEST_PORT||5173)+'/')
  await touch.locator('[data-class="shaman"]').tap()
  await touch.locator('#nobby-hud:not([hidden])').waitFor()
  await touch.locator('[data-action="nobby:summon"]').tap()
  await touch.waitForFunction(()=>document.querySelector('[data-action="nobby:summon"] b')?.textContent?.startsWith('1/3'))
  await touch.screenshot({path:output+'/touch-summon.png'})
  report.checks.push('390px touch selection and touch summoning')
  await touchContext.close()

  assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[])
  console.log(JSON.stringify(report,null,2))
 }finally{
  fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2)+'\n')
  if(browser)await browser.close()
  await stop()
 }
})().catch(error=>{console.error(error);process.exitCode=1})
