const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const ensureDevServer=require('./ensure-dev-server.cjs');


(async()=>{
 const {unpackNavigation,isBlocked}=await import('../src/navigation/pathfinding.mjs');
 const {clearShot,ARCANE_MANA,ARCANE_RANGE}=await import('../src/combat/arcane-rules.mjs');
 const worlds=require('../src/generated/worlds.json');
 const stop=await ensureDevServer();
 let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/modules/main/display.ts*',async route=>{
   const response=await route.fetch();
   const original=await response.text();
   const body=original.replace('onStep(engine) {',
    'onStep(engine) { window.__spellReview={engine,get server(){return engine.context.get("server")}};');
   assert.notEqual(body,original,'browser instrumentation not installed');
   await route.fulfill({response,body});
  });
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForFunction(()=>window.__spellReview?.engine?.getCurrentPlayer()&&
   !document.querySelector('#nobby-hud')?.hidden,{},{timeout:20000});
  const world=worlds.find(w=>w.id==='simplemap'),nav=unpackNavigation(world.navigation);
  const foe=world.objects.find(o=>o.kind==='monster');
  assert.ok(foe,'no authored enemy available');
  let start=null;
  for(const r of [180,210,240,270,300])for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-.7,-.7],[.7,.7]]){
   const p={x:Math.round((foe.x+r*dx)/16)*16,y:Math.round((foe.y+r*dy)/16)*16};
   if(isBlocked(nav,p.x/16,p.y/16)||Math.hypot(p.x-foe.x,p.y-foe.y)>ARCANE_RANGE-20)continue;
   if(!clearShot(nav,p,foe))continue;
   if(!start)start=p;
  }
  assert.ok(start,'no clear mage casting site near enemy');
  await page.evaluate(()=>{window.__spellCast=[];window.__spellFX=[];
    window.addEventListener('nobby:spell-cast',e=>window.__spellCast.push(e.detail));
    window.addEventListener('nobby:spell-visual',e=>window.__spellFX.push(e.detail));
  });
  await page.evaluate(async({x,y})=>{
   const e=window.__spellReview.engine;
   const p=Object.values(window.__spellReview.server.subRoom.players())[0];
   e.interruptCurrentPlayerMovement(e.getCurrentPlayer());
   await p.teleport({x,y});
   e.applyAuthoritativeState({x,y});
   p.sp=100;
  },start);
  await page.waitForFunction((expected)=>{
   const p=window.__spellReview.engine.getCurrentPlayer();
   return p&&Math.abs(p.x()-expected.x)<8&&Math.abs(p.y()-expected.y)<8&&p.spSignal()===100
  },start,{timeout:12000});
  // The authoritative map is the one the attacking player belongs to,
  // not necessarily server.subRoom (which may be a transfer wrapper).
  const before=await page.evaluate(targetId=>{
   const s=window.__spellReview.server.subRoom,p=Object.values(s.players())[0];
   const map=p.getCurrentMap(),events=map?.events?.()??{};
   const enemy=map?.getEvent?.(targetId) ??
     Object.values(events).find(e=>e.nobbyWorldObjectId===targetId);
   if(!enemy)throw Error('target not present in authoritative player map: '+
     JSON.stringify({targetId,mapId:map?.id,serverSubRoomId:s.id,
       authoredTargetKeys:Object.keys(events).slice(0,6)}));
   return {hp:enemy.hp,mana:p.sp,
     actualId:enemy.id,from:{x:p.x(),y:p.y()},to:{x:enemy.x(),y:enemy.y()}};
  },foe.id);
  assert.equal(before.mana,100);
  const click=await page.evaluate(targetId=>{
   const e=window.__spellReview.engine;
   const enemy=e.sceneMap.events()[targetId],canvas=e.renderer.canvas;
   const lookup=node=>{if(node?.toWorld&&node?.toScreen)return node;
    for(const child of node?.children??[]){const v=lookup(child);if(v)return v}};
   if(!enemy)throw Error('target event not visible in client room');
   const viewport=lookup(e.canvasApp.stage),rect=canvas.getBoundingClientRect();
   const screen=viewport.toScreen(enemy.x()+16,enemy.y()-19);
   return {x:rect.left+screen.x,y:rect.top+screen.y};
  },foe.id);
  const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName==='CANVAS',click);
  assert.ok(hit,'monster not visible on canvas');
  await page.mouse.click(click.x,click.y);
  await page.waitForFunction(()=>window.__spellCast.length>0,{},{timeout:5000});
  assert.equal(await page.evaluate(()=>document.querySelectorAll('.nobby-arcane-orb').length),1,
    'magical orb was not drawn in the game');
  await page.waitForFunction(({targetId,hp})=>{
   const player=Object.values(window.__spellReview.server.subRoom.players())[0];
   const map=player.getCurrentMap();
   const enemy=map?.getEvent(targetId) ??
     Object.values(map?.events?.()??{}).find(e=>e.nobbyWorldObjectId===targetId);
   return enemy?.hp<hp;
  },{targetId:foe.id,hp:before.hp},{timeout:6000}).catch(async()=>{
   const details=await page.evaluate(targetId=>{
     const player=Object.values(window.__spellReview.server.subRoom.players())[0];
     const map=player.getCurrentMap(),enemy=map?.getEvent(targetId) ??
       Object.values(map?.events?.()??{}).find(e=>e.nobbyWorldObjectId===targetId);
     return {mapId:map?.id,playerMana:player.sp,enemyHp:enemy?.hp,
       enemyRuntimeId:enemy?.id,ai:enemy?.battleAi?.getState?.(),
       target:enemy?.battleAi?.getTarget?.()?.id,events:Object.keys(map?.events?.()??{}).slice(0,8)};
   },foe.id);
   throw new Error('Server did not apply spell damage: '+JSON.stringify(details));
  });
  const after=await page.evaluate(targetId=>{
   const p=Object.values(window.__spellReview.server.subRoom.players())[0];
   const m=p.getCurrentMap(),target=m?.getEvent(targetId) ??
     Object.values(m?.events?.()??{}).find(e=>e.nobbyWorldObjectId===targetId);
   return {hp:target?.hp??0,mana:p.sp,fx:window.__spellFX,
     ai:target?.battleAi?.getState?.(),aggro:target?.battleAi?.getTarget?.()?.id,
     visionRange:target?.battleAi?.visionRange,playerId:p.id};
  },foe.id);
  assert.equal(after.mana,before.mana-ARCANE_MANA,'mana spent by authoritative server');
  assert.ok(after.hp<before.hp,'ActionBattle damage actually hit the enemy');
  assert.equal(after.aggro,after.playerId,'Wounded enemy must target the attacker immediately');
  assert.ok(after.visionRange>=440,'Wounded enemy must chase beyond normal sight range');
  await page.waitForFunction(()=>window.__spellFX.some(e=>e.phase==='impact'),{},{timeout:5000});
  assert.deepEqual(errors,[],'no browser exceptions');
  console.log('Mage combat browser review passed:',{enemy:foe.id,from:before.from,to:before.to,initialHp:before.hp,finalHp:after.hp,manaSpent:ARCANE_MANA,aggro:after.aggro,ai:after.ai});
 }finally{
  if(browser)await browser.close();
  await stop();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
