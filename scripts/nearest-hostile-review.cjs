const {chromium}=require('playwright')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const ensureDevServer=require('./ensure-dev-server.cjs')
;(async()=>{
 const stop=await ensureDevServer();let browser
 const report={checks:[],errors:[]},output='artifacts/expansion'
 try{
  browser=await chromium.launch({...(process.env.CI?{}:{channel:'chrome'}),headless:true,args:['--enable-unsafe-swiftshader']})
  const page=await browser.newPage({viewport:{width:1280,height:800}})
  page.on('pageerror',e=>report.errors.push(e.message))
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())})
  page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url())})
  await page.route('**/src/modules/main/display.ts*',async route=>{
   const response=await route.fetch(),source=await response.text()
   const body=source.replace('onStep(engine) {','onStep(engine) { window.__nearestReview={engine,get server(){return engine.context.get("server")}};')
   assert.notEqual(body,source);await route.fulfill({response,body})
  })
  await page.goto('http://127.0.0.1:'+(process.env.NOBBY_TEST_PORT||5173)+'/')
  await page.locator('[data-class="shaman"]').click()
  await page.waitForFunction(()=>Object.values(window.__nearestReview?.server?.subRoom?.players?.()??{}).some(p=>p.nobbyClass()==='shaman'))
  await page.waitForTimeout(500)
  await page.keyboard.press('r')
  await page.waitForFunction(()=>Object.values(window.__nearestReview.server.subRoom.events()).some(e=>e.nobbyCompanion))
  await page.waitForTimeout(800)
  const ids=await page.evaluate(async()=>{
   const map=window.__nearestReview.server.subRoom,p=Object.values(map.players())[0]
   const events=Object.values(map.events()),ally=events.find(e=>e.nobbyCompanion),foe=events.find(e=>e.battleAi?.getFaction()==='enemies')
   const {unpackNavigation,isBlocked}=await import('/src/navigation/pathfinding.mjs')
   const {default:worlds}=await import('/src/generated/worlds.json?import')
   const nav=unpackNavigation(worlds.find(w=>w.id===String(map.id).replace(/^map-/,'' )).navigation)
   let point,best=Infinity
   for(let y=5;y<nav.rows-5;y++)for(let x=5;x<nav.cols-12;x++){
    const score=Math.hypot(x*16-p.x(),y*16-p.y())
    if(score<best&&Array.from({length:9},(_,i)=>[x+i,y]).every(([cx,cy])=>!isBlocked(nav,cx,cy))){
     point={x:x*16,y:y*16};best=score
    }
   }
   if(!point)throw Error('No open test corridor')
   for(const other of events)if(other.battleAi?.getFaction()==='enemies'&&other!==foe)other.battleAi.destroy()
   foe.stopMoveTo();ally.stopMoveTo();foe.speed=0;ally.speed=0
   ally.setParameter('maxHp',1000);ally.allRecovery()
   foe.paramsModifier={...foe.paramsModifier,pdef:{value:100}}
   foe.nobbyAggroRange=300
   await foe.teleport(point)
   await ally.teleport({x:point.x+32,y:point.y})
   await p.teleport({x:point.x+112,y:point.y})
   return {foe:foe.id,ally:ally.id,player:p.id,point,allyHp:ally.hp,playerHp:p.hp}
  })
  await page.waitForFunction(ids=>window.__nearestReview.server.subRoom.events()[ids.foe].battleAi.getTarget()?.id===ids.ally,ids).catch(async error=>{console.log('DIAGNOSTIC',await page.evaluate(()=>Object.values(window.__nearestReview.server.subRoom.events()).filter(e=>e.battleAi).map(e=>({id:e.id,hp:e.hp,x:e.x(),y:e.y(),target:e.battleAi.getTarget()?.id,nearest:e.nobbyNearestTargetId}))),await page.evaluate(()=>Object.values(window.__nearestReview.server.subRoom.players()).map(p=>({id:p.id,hp:p.hp,x:p.x(),y:p.y()}))));throw error})
  await page.waitForFunction(ids=>window.__nearestReview.server.subRoom.events()[ids.ally]?.hp<ids.allyHp,ids,{timeout:10000})
  assert.equal(await page.evaluate(()=>Object.values(window.__nearestReview.server.subRoom.players())[0].hp),ids.playerHp)
  report.checks.push('enemy attacks closer skeleton; distant shaman takes no damage despite owner XP attribution')
  await page.screenshot({path:output+'/nearest-skeleton.png'})
  const playerHp=await page.evaluate(async ids=>{
   const p=Object.values(window.__nearestReview.server.subRoom.players())[0]
   await p.teleport({x:ids.point.x+16,y:ids.point.y});return p.hp
  },ids)
  await page.waitForFunction(ids=>window.__nearestReview.server.subRoom.events()[ids.foe].battleAi.getTarget()?.id===ids.player,ids)
  await page.waitForFunction(hp=>Object.values(window.__nearestReview.server.subRoom.players())[0].hp<hp,playerHp,{timeout:10000})
  report.checks.push('enemy switches and damages player when player becomes nearer than skeleton')
  await page.evaluate(async ids=>{
   const map=window.__nearestReview.server.subRoom,p=Object.values(map.players())[0]
   await p.teleport({x:ids.point.x+112,y:ids.point.y})
  },ids)
  await page.waitForFunction(ids=>window.__nearestReview.server.subRoom.events()[ids.foe].battleAi.getTarget()?.id===ids.ally,ids).catch(async error=>{console.log('DIAGNOSTIC',await page.evaluate(()=>Object.values(window.__nearestReview.server.subRoom.events()).filter(e=>e.battleAi).map(e=>({id:e.id,hp:e.hp,x:e.x(),y:e.y(),target:e.battleAi.getTarget()?.id,nearest:e.nobbyNearestTargetId}))),await page.evaluate(()=>Object.values(window.__nearestReview.server.subRoom.players()).map(p=>({id:p.id,hp:p.hp,x:p.x(),y:p.y()}))));throw error})
  await page.evaluate(ids=>{window.__nearestReview.server.subRoom.events()[ids.ally].hp=1},ids)
  await page.waitForFunction(ids=>window.__nearestReview.server.subRoom.events()[ids.foe].battleAi.getTarget()?.id===ids.player,ids)
  await page.waitForFunction(ids=>!window.__nearestReview.server.subRoom.events()[ids.ally],ids)
  await page.waitForTimeout(800)
  report.checks.push('dead skeleton is removed and enemy resumes nearest living hostile')
  assert.deepEqual(report.errors,[])
 }finally{
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(output+'/nearest-hostile-report.json',JSON.stringify(report,null,2)+'\n')
  await browser?.close();await stop()
 }
 console.log(JSON.stringify(report,null,2))
})().catch(error=>{console.error(error);process.exitCode=1})
