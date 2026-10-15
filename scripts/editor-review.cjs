const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
 // Test-only inspection hook, injected into the dev response, never shipped.
 await page.route('**/src/standalone.ts',async route=>{
  const response=await route.fetch();let body=await response.text();
  body=body.replace('mergeConfig }','mergeConfig, inject }').replace('provideRpg, startGame }','provideRpg, startGame, RpgClientEngine }').replace('startGame(','window.__ready=startGame(');
  await route.fulfill({response,body:body+'\nwindow.__ready.then(context=>{window.__editor={engine:inject(context,RpgClientEngine),get server(){return context.get("server")}}});'});
 });
 await page.goto('http://localhost:5173/');
 await page.waitForFunction(()=>window.__editor&&Object.keys(window.__editor.engine.sceneMap.events()).length===4,{},{timeout:15000});
 await page.waitForTimeout(500);
 const state=await page.evaluate(()=>{
  const r=window.__editor,read=v=>typeof v==='function'?v():v;
  return {room:r.server.getCurrentRoomId(),events:Object.values(r.server.subRoom.events()).map(e=>({id:read(e.id),name:read(e.name),x:e.x(),y:e.y(),hp:read(e.hp),ai:!!e.battleAi}))};
 });
 assert.equal(state.room,'map-simplemap');assert.equal(state.events.filter(e=>e.ai).length,2);
 assert.deepEqual(state.events.filter(e=>e.ai).map(e=>e.hp).sort((a,b)=>a-b),[65,90]);
 fs.mkdirSync('artifacts/editor',{recursive:true});await page.screenshot({path:'artifacts/editor/world.png'});
 await page.evaluate(async()=>{const room=window.__editor.server.subRoom,p=Object.values(room.players())[0],m=room.events()['object-3'];await p.teleport({x:m.x()-30,y:m.y()});p.changeDirection('right')});
 await page.waitForTimeout(200);await page.keyboard.press('ArrowRight',{delay:150});await page.waitForTimeout(2200);assert.ok(await page.evaluate(()=>Object.values(window.__editor.server.subRoom.players())[0].hp<741),'enemy AI fights back');await page.keyboard.press('ArrowRight',{delay:200});await page.keyboard.press('Space',{delay:150});await page.waitForTimeout(350);
 const fight=await page.evaluate(()=>{const room=window.__editor.server.subRoom,p=Object.values(room.players())[0],m=room.events()['object-3'];return{enemyHP:m?.hp??0,heroHP:p.hp,gold:p.gold}});
 assert.ok(fight.enemyHP<65,'Space damages the placed enemy');
 await page.screenshot({path:'artifacts/editor/combat.png'});
 for(let i=0;i<8;i++){if(await page.evaluate(()=>Object.values(window.__editor.server.subRoom.players())[0].gold>0))break;await page.keyboard.press('ArrowRight',{delay:180});await page.keyboard.press('Space',{delay:100});await page.waitForTimeout(250)}
 assert.ok(await page.evaluate(()=>Object.values(window.__editor.server.subRoom.players())[0].gold>0),'defeated enemy grants gold');
 async function usePortal(target){
  await page.evaluate(async()=>{const p=Object.values(window.__editor.server.subRoom.players())[0];await p.teleport({x:420,y:438});p.changeDirection('down')});
  await page.waitForTimeout(250);await page.keyboard.press('ArrowDown',{delay:120});await page.keyboard.press('Space',{delay:150});
  await page.waitForFunction(target=>window.__editor.server.getCurrentRoomId()==='map-'+target,target,{timeout:10000});
  await page.waitForFunction(()=>{const p=Object.values(window.__editor.server.subRoom.players())[0];return p&&Math.abs(p.x()-300)<4&&Math.abs(p.y()-300)<4},{},{timeout:10000});
  await page.waitForTimeout(700);
 }
 await usePortal('wald');await page.screenshot({path:'artifacts/editor/second-world.png'});await usePortal('simplemap');
 // Saving this one property models a Tiled save; the file is restored even on failure.
 const file='src/tiled/simplemap.tmx',original=fs.readFileSync(file,'utf8');
 try{
  const navigation=page.waitForEvent('framenavigated',{predicate:f=>f===page.mainFrame(),timeout:10000});
  fs.writeFileSync(file,original.replace('name="level" type="int" value="1"','name="level" type="int" value="3"'));
  await navigation;
  await page.waitForFunction(()=>window.__editor?.server?.subRoom?.events?.()['object-3']?.hp===115,{},{timeout:15000});
  await page.waitForTimeout(700);
  await page.screenshot({path:'artifacts/editor/live-edit.png'});
 }finally{fs.writeFileSync(file,original)}
 await page.waitForFunction(()=>window.__editor?.server?.subRoom?.events?.()['object-3']?.hp===65,{},{timeout:15000});
 await page.waitForTimeout(700);
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 fs.writeFileSync('artifacts/editor/report.json',JSON.stringify({browser:'Chrome / Playwright',state,checks:['Tiled coordinates and enemy levels imported','Space damages enemies','AI counterattacks','defeat grants gold','portal changes map and returns','saved map property reloads a level 3 enemy, then restores original file'],errors,missing},null,2)+'\n');
 await browser.close();
 console.log('Local editor integration review passed.');
})().catch(e=>{console.error(e);process.exit(1)});
