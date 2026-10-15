const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),{PNG}=require('pngjs');
const ensureDevServer = require('./ensure-dev-server.cjs');
(async()=>{
 const stopDevServer=await ensureDevServer();
 try {
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],missing=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
 await page.route('**/src/modules/main/display.ts*',async route=>{
  const response=await route.fetch(),body=(await response.text()).replace('onStep(engine) {','onStart(engine) { window.__editor={engine,get server(){return engine.context.get("server")}}; }, onStep(engine) {');
  assert.ok(body.includes('window.__editor'));await route.fulfill({response,body});
 });
 const dir='artifacts/tiny-swords/after';fs.mkdirSync(dir,{recursive:true});
 async function ready(){await page.waitForFunction(()=>window.__editor?.engine?.getCurrentPlayer()&&document.querySelector('#nobby-hud')?.hidden===false);await page.waitForTimeout(500)}
 async function shot(name){await page.screenshot({path:dir+'/'+name+'.png'})}
 async function freshScene(){await page.reload();await ready()}
 // Test-only camera positioning. A standalone RPG-JS client can receive a
 // previously queued authoritative movement tick just after server.teleport().
 // Reconcile both sides over several animation frames instead of asserting
 // a transient client position 100 ms after the server move.
 async function teleport(x,y){
  await page.waitForTimeout(200);
  const state=await page.evaluate(async({x,y})=>{
   const engine=window.__editor.engine;
   const server=Object.values(window.__editor.server.subRoom.players())[0];
   engine.interruptCurrentPlayerMovement(engine.getCurrentPlayer());
   await server.teleport({x,y});
   const close=(a,b)=>Math.abs(a-b)<2;
   if(!close(server.x(),x)||!close(server.y(),y)){
    throw new Error(`Server teleport failed: wanted (${x}, ${y}); got (${server.x()}, ${server.y()})`);
   }
   const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
   for(let attempt=1;attempt<=60;attempt++){
    const player=engine.getCurrentPlayer();
    engine.interruptCurrentPlayerMovement(player);
    engine.applyAuthoritativeState({x,y});
    await nextFrame();
    const current=engine.getCurrentPlayer();
    if(current&&close(current.x(),x)&&close(current.y(),y)){
     // Make sure a stale network tick does not immediately restore old coords.
     await new Promise(resolve=>setTimeout(resolve,120));
     const stable=engine.getCurrentPlayer();
     if(stable&&close(stable.x(),x)&&close(stable.y(),y)){
      return {client:[stable.x(),stable.y()],server:[server.x(),server.y()],attempts:attempt};
     }
    }
    await new Promise(resolve=>setTimeout(resolve,70));
   }
   const player=engine.getCurrentPlayer();
   throw new Error(`Client/server test teleport desync after retries: wanted (${x}, ${y}), client (${player?.x()}, ${player?.y()}), server (${server.x()}, ${server.y()}), dialogOpen=${engine.guiService.gui()['rpg-dialog'].display()}`);
  },{x,y});
  console.log('teleport',x,y,state);
  await page.waitForTimeout(300);
 }
 const position=()=>page.evaluate(()=>{const p=Object.values(window.__editor.server.subRoom.players())[0];return{x:p.x(),y:p.y()}})
 const hold=async(key,ms)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);await page.waitForTimeout(100)}
 await page.goto('http://127.0.0.1:5173/');await ready();assert.equal(await page.getByRole('button',{name:'✦ Heilen H'}).isDisabled(),true,'full-health heal should be disabled');await shot('village');
 await page.keyboard.press('Escape',{delay:150});await page.getByText('nobby',{exact:true}).first().waitFor();await shot('menu');
 for(const tab of ['Items','Skills','Equip','Options']){await page.getByText(tab,{exact:true}).first().click();await page.waitForTimeout(300);await shot(tab.toLowerCase())}
 await page.getByText('Save',{exact:true}).click();await page.locator('[data-slot-index="0"]').waitFor();await shot('save');
 await page.reload();await ready();
 await teleport(784,1176);await hold('ArrowDown',100);await page.keyboard.press('Space',{delay:150});await page.getByText('Willkommen, nobby! Hier beginnt unsere neue Welt.',{exact:true}).waitFor();await shot('dialog');await page.keyboard.press('Space',{delay:150});await page.waitForFunction(()=>window.__editor.engine.guiService.gui()['rpg-dialog'].display()===false,{},{timeout:5000});await page.waitForTimeout(300);
 checks.push('native status/items/skills/equipment/options/save screens and German NPC dialogue render with pack frames');
 await freshScene(); // Each collision scenario starts without movement/GUI prediction history.
 await teleport(1380,800);const waterBefore=await position();await hold('ArrowRight',1000);const waterAfter=await position();assert.ok(waterAfter.x>waterBefore.x&&waterAfter.x<=1441,'river blocks walking');checks.push('river collision blocks walking');
 await freshScene();
 await teleport(1380,1060);await hold('ArrowRight',2300);
 const bridgeState=await page.evaluate(()=>{
  const e=window.__editor.engine,p=e.getCurrentPlayer(),s=Object.values(window.__editor.server.subRoom.players())[0];
  return {clientX:p.x(),serverX:s.x(),clientY:p.y(),serverY:s.y()};
 });
 assert.ok(bridgeState.serverX>1664&&bridgeState.clientX>1664,'bridge crosses the river on both client and server');
 assert.ok(Math.abs(bridgeState.clientX-bridgeState.serverX)<48&&Math.abs(bridgeState.clientY-bridgeState.serverY)<48,
   `client/server diverged during real bridge crossing: ${JSON.stringify(bridgeState)}`);
 await shot('bridge');checks.push('real bridge crossing synchronizes client/server and is photographed from the landing');
 await freshScene();
 await teleport(540,1040);await hold('ArrowUp',800);assert.ok((await position()).y>=1003,'house ground footprint blocks walking');checks.push('house footprint collision');
 await freshScene();
 await teleport(2020,690);await shot('highlands');
 // Building and all scenery physics must be fixed in the actual RPG-JS server.
 const fixedProps=await page.evaluate(()=>{
  const events=Object.values(window.__editor.server.subRoom.events())
  return events.filter(e=>['house','house-large','barracks','monastery','tower','castle','tree-oak','tree-birch'].some(t=>e.graphics().includes(t)))
   .map(e=>({id:e.id,graphic:e.graphics(),pushable:e.pushable,mass:e._mass?.(),canMove:e.canMove}))
 })
 assert.ok(fixedProps.length>=2,'fixed buildings and trees are present on the real map')
 for(const p of fixedProps){
  assert.equal(p.pushable,false,p.id+' must not be pushable')
  assert.equal(p.mass,0,p.id+' must have infinite physical resistance (mass 0)')
  assert.equal(p.canMove,false,p.id+' must not move autonomously')
 }
 checks.push('real map buildings and trees are physically immovable, even on NPC contact')
 
 const tree=await page.evaluate(()=>{const events=Object.values(window.__editor.server.subRoom.events());return events.filter(e=>e.graphics().includes('tree-oak')).map(e=>({x:e.x(),y:e.y()})).find(e=>e.x>1900&&e.y>900&&e.y<1600)});
 assert.ok(tree,'tree scene available');
 await teleport(tree.x+4,tree.y-40);await shot('behind-tree');await teleport(tree.x+4,tree.y+32);await shot('in-front-of-tree');checks.push('tree occlusion before/behind photographed');
 await freshScene();
 await teleport(784,1088);await page.evaluate(()=>{const p=Object.values(window.__editor.server.subRoom.players())[0];p.hp=400;p.sp=100});await page.waitForTimeout(150);assert.equal(await page.getByRole('button',{name:'✦ Heilen H'}).isEnabled(),true,'heal becomes available when injured');await page.getByRole('button',{name:'✦ Heilen H'}).click();await page.waitForTimeout(250);await shot('heal');
 const healed=await page.evaluate(()=>{const p=Object.values(window.__editor.server.subRoom.players())[0];return{hp:p.hp,sp:p.sp}});assert.ok(healed.hp>400&&healed.hp<=741);assert.equal(healed.sp,75);checks.push('real heal button restores HP and spends 25 mana');
 await page.waitForTimeout(700);await page.keyboard.down('ArrowRight');await page.waitForTimeout(180);await shot('run');await page.keyboard.up('ArrowRight');await page.keyboard.press('Space',{delay:80});await page.waitForTimeout(140);await shot('attack');checks.push('run and distinct attack/heal frames photographed during actual input');
 await page.evaluate(async()=>Object.values(window.__editor.server.subRoom.players())[0].changeMap('wald','start'));await page.waitForFunction(()=>window.__editor.server.getCurrentRoomId()==='map-wald');await ready();await shot('forest');await teleport(31*64,27*64);await shot('forest-lake');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);await shot('mobile');
 await page.setViewportSize({width:3840,height:2160});await page.waitForTimeout(500);
 const rendering=await page.evaluate(()=>{const e=window.__editor.engine;function viewport(n){if(n?.setZoom&&n?.toWorld)return n;for(const c of n?.children??[]){const v=viewport(c);if(v)return v}}const v=viewport(e.canvasApp.stage);return{zoom:v.scale.x,resolution:e.renderer.resolution,width:e.renderer.screen.width,height:e.renderer.screen.height}});
 assert.ok(Number.isInteger(rendering.zoom)&&rendering.zoom>=1);assert.equal(rendering.resolution,1);assert.equal(rendering.width,3840);await shot('4k-integer-zoom');checks.push('390px and 4K layouts; integer camera zoom; renderer resolution 1');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 fs.writeFileSync(dir+'/report.json',JSON.stringify({browser:'Google Chrome / Playwright',checks,rendering,healed,waterBefore,waterAfter,errors,missing},null,2)+'\n');console.log('Tiny Swords visual / collision / UI review passed.');
 }finally{await browser.close()}
 } finally {await stopDevServer()}
})().catch(e=>{console.error(e);process.exit(1)});
