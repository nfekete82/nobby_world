const {chromium}=require('playwright')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const ensureDevServer=require('./ensure-dev-server.cjs')

;(async()=>{
 const stop=await ensureDevServer()
 let browser
 try{
  browser=await chromium.launch({...(process.env.CI?{}:{channel:'chrome'}),
   headless:true,args:['--enable-unsafe-swiftshader']})
  const page=await browser.newPage({viewport:{width:1280,height:800}})
  const errors=[],missing=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
  await page.route('**/src/modules/main/display.ts*',async route=>{
   const response=await route.fetch()
   const source=await response.text()
   const changed=source.replace('onStep(engine) {',
    'onStart(engine) { window.__sheepReview={engine,get server(){return engine.context.get("server")}}; }, onStep(engine) {')
   assert.notEqual(changed,source,'test instrumentation was not injected')
   await route.fulfill({response,body:changed})
  })
  await page.goto('http://127.0.0.1:5173/')
  await page.waitForFunction(()=>window.__sheepReview?.engine?.getCurrentPlayer()&&
   document.querySelector('#nobby-hud')?.hidden===false,{},{timeout:20000})
  const sample=()=>page.evaluate(()=>{
   const s=window.__sheepReview.server
   return Object.values(s.subRoom.events()).filter(e=>
    typeof e.graphics==='function'&&e.graphics().includes('sheep'))
    .map(e=>({id:e.id,x:e.x(),y:e.y()}))
  })
  await page.waitForFunction(()=>Object.values(window.__sheepReview?.server?.subRoom?.events?.()||{})
   .filter(e=>typeof e.graphics==='function'&&e.graphics().includes('sheep')).length>=4,
   {},{timeout:10000})
  const worlds=JSON.parse(fs.readFileSync('src/generated/worlds.json','utf8'))
  const map=worlds.find(w=>w.id==='simplemap')
  assert.ok(map?.pasture?.bits)
  const mask=Buffer.from(map.pasture.bits,'hex')
  const isGrass=(x,y)=>{
   const tx=Math.floor(x/64),ty=Math.floor(y/64)
   if(tx<0||ty<0||tx>=map.pasture.width||ty>=map.pasture.height)return false
   const index=ty*map.pasture.width+tx
   return Boolean(mask[index>>3]&(1<<(index&7)))
  }
  let before=await sample(),moved=false
  for(let i=0;i<22;i++){
   await page.waitForTimeout(1000)
   const after=await sample()
   for(const sheep of after){
    const start=before.find(x=>x.id===sheep.id)
    if(start&&(Math.abs(start.x-sheep.x)>5||Math.abs(start.y-sheep.y)>5))moved=true
    const authored=map.objects.find(o=>o.id===sheep.id)
    if(authored&&isGrass(authored.x,authored.y)){
     assert.ok(isGrass(sheep.x,sheep.y),sheep.id+' walked off grass: '+JSON.stringify(sheep))
     assert.ok(Math.abs(sheep.x-authored.x)<320&&Math.abs(sheep.y-authored.y)<320,
      sheep.id+' wandered too far from home')
    }
   }
  }
  assert.ok(moved,'No sheep moved during 22 seconds')
  assert.deepEqual(errors,[])
  assert.deepEqual(missing,[])
  console.log('Sheep browser review OK: roaming on grass with no page errors or missing assets.')
 }finally{
  if(browser)await browser.close()
  await stop()
 }
})().catch(error=>{console.error(error);process.exitCode=1})
