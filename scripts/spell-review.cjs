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
  browser=await chromium.launch({
   ...(process.env.CI?{}:{channel:'chrome'}),
   headless:true,args:['--enable-unsafe-swiftshader']
  });
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
  // The HUD becomes visible before RPG-JS has received its authoritative
  // spawn (x/y are initially zero). A premature search starts at (0,0),
  // outside navigable terrain, and wrongly reports "no clean shot".
  await page.waitForFunction(start=>{
   const e=window.__spellReview?.engine,p=e?.getCurrentPlayer();
   return e?.sceneMap.data()?.id==='simplemap'&&p?.hpSignal?.()>0&&
    Number.isFinite(p?.x?.())&&Number.isFinite(p?.y?.())&&
    Math.hypot(p.x()-start.x,p.y()-start.y)<48;
  },world.start,{timeout:15000}).catch(async()=>{
    const value=await page.evaluate(()=>{
     const e=window.__spellReview?.engine,p=e?.getCurrentPlayer();
     return {mapId:e?.sceneMap.data()?.id,
      player:p?{x:p.x(),y:p.y(),hp:p.hpSignal?.(),sp:p.spSignal?.()}:null};
    });
    throw new Error('Player map spawn not ready: '+JSON.stringify(value));
  });
  const foe=world.objects.find(o=>o.kind==='monster');
  assert.ok(foe,'no authored enemy available');
  await page.evaluate(()=>{
   window.__spellCast=[];window.__spellFX=[];window.__spellRejected=[];window.__spellServer=[];
   window.addEventListener('nobby:spell-server',e=>window.__spellServer.push(e.detail));
   window.addEventListener('nobby:spell-cast',e=>window.__spellCast.push(e.detail));
   window.addEventListener('nobby:spell-visual',e=>window.__spellFX.push(e.detail));
   window.addEventListener('nobby:spell-rejected',e=>window.__spellRejected.push(e.detail));
  });
  // Never teleport the player away from the camera. Instead stage the real,
  // server-controlled monster within the ORIGINAL player's visible viewport.
  // This tests a genuine browser left click on the rendered canvas.
  const origin=await page.evaluate(()=>{
   const p=window.__spellReview.engine.getCurrentPlayer();
   return {x:p.x(),y:p.y()};
  });
  const candidateSites=[];
  for(const radius of [210,240,180,270,300]){
   for(const [dx,dy] of [[1,0],[-1,0],[0,-1],[0,1],[.7,-.7],[-.7,-.7],[.7,.7],[-.7,.7]]){
    const candidate={
     x:Math.round((origin.x+radius*dx)/16)*16,
     y:Math.round((origin.y+radius*dy)/16)*16
    };
    if(isBlocked(nav,Math.round(candidate.x/16),Math.round(candidate.y/16)))continue;
    if(Math.hypot(candidate.x-origin.x,candidate.y-origin.y)>ARCANE_RANGE-45)continue;
    if(!clearShot(nav,origin,candidate))continue;
    candidateSites.push(candidate);
   }
  }
  assert.ok(candidateSites.length,'no clean shot near the fully spawned player: '+
    JSON.stringify({origin,worldStart:world.start,
      originBlocked:isBlocked(nav,Math.round(origin.x/16),Math.round(origin.y/16))}));

  await page.waitForFunction(targetId=>{
   const p=Object.values(window.__spellReview.server.subRoom.players())[0];
   const map=p?.getCurrentMap?.();
   const foe=map?.getEvent?.(targetId) ??
     Object.values(map?.events?.()??{}).find(e=>e.nobbyWorldObjectId===targetId);
   const client=window.__spellReview.engine.sceneMap.events()?.[targetId];
   return !!(foe?.battleAi&&foe.hp>0&&client);
  },foe.id,{timeout:12000});

  let staged=null;
  for(const candidate of candidateSites){
   await page.evaluate(async({targetId,site})=>{
    const p=Object.values(window.__spellReview.server.subRoom.players())[0];
    const map=p.getCurrentMap();
    const target=map?.getEvent(targetId) ??
      Object.values(map?.events?.()??{}).find(e=>e.nobbyWorldObjectId===targetId);
    if(!target)throw Error('authoritative monster missing while staging');
    target.stopMoveTo?.();
    await target.teleport(site);
    p.sp=100;
   },{targetId:foe.id,site:candidate});
   // Wait for position replication before projecting it through the REAL camera.
   try {
    await page.waitForFunction(({targetId,site})=>{
     const e=window.__spellReview.engine.sceneMap.events()?.[targetId];
     return !!e&&Math.abs(e.x()-site.x)<8&&Math.abs(e.y()-site.y)<8;
    },{targetId:foe.id,site:candidate},{timeout:1200});
   }catch{continue}
   const projected=await page.evaluate(targetId=>{
    const e=window.__spellReview.engine,enemy=e.sceneMap.events()?.[targetId],canvas=e.renderer.canvas;
    const viewportOf=node=>{
     if(node?.toWorld&&node?.toScreen)return node;
     for(const child of node?.children??[]){const v=viewportOf(child);if(v)return v}
    };
    const viewport=viewportOf(e.canvasApp?.stage),rect=canvas.getBoundingClientRect();
    if(!enemy||!viewport)return null;
    const screen=viewport.toScreen(enemy.x()+16,enemy.y()-19);
    const x=rect.left+screen.x,y=rect.top+screen.y;
    const inside=x>=rect.left+15&&x<rect.right-15&&y>=rect.top+15&&y<rect.bottom-15;
    return {x,y,inside,onCanvas:inside&&document.elementFromPoint(x,y)===canvas,
     rectangle:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}};
   },foe.id);
   if(projected?.onCanvas){staged={site:candidate,click:projected};break}
  }
  assert.ok(staged,'no enemy test position projected onto an unobscured canvas; possible camera/viewport bug: '+
    JSON.stringify({origin,sites:candidateSites.length}));
  const click={x:staged.click.x,y:staged.click.y};
  // Client-side mana is also validated before sending the request; allow
  // Signe synchronization to deliver the server's restored mana.
  await page.waitForFunction(()=>{
   const p=window.__spellReview.engine.getCurrentPlayer();
   return p?.spSignal?.()===100;
  },{},{timeout:4000}).catch(async()=>{
   const resources=await page.evaluate(()=>{
    const c=window.__spellReview.engine.getCurrentPlayer();
    const s=Object.values(window.__spellReview.server.subRoom.players())[0];
    return {clientMana:c?.spSignal?.(),serverMana:s?.sp,
      x:c?.x?.(),y:c?.y?.()};
   });
   throw new Error('Authoritative mana did not sync before click: '+JSON.stringify(resources));
  });
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
  await page.mouse.click(click.x,click.y);
  await page.waitForFunction(()=>window.__spellCast.length>0,{},{timeout:5000}).catch(async()=>{
   const diagnostics=await page.evaluate(({click,targetId})=>{
    const e=window.__spellReview.engine;
    const server=window.__spellReview.server.subRoom;
    const p=Object.values(server.players())[0],enemy=e.sceneMap.events()?.[targetId];
    return {click,mapId:e.sceneMap.data()?.id,
     clientHp:e.getCurrentPlayer()?.hpSignal?.(),clientMana:e.getCurrentPlayer()?.spSignal?.(),
     enemyHp:enemy?.hpSignal?.(),enemyPos:enemy?{x:enemy.x(),y:enemy.y()}:null,
     clientRejected:window.__spellRejected,casts:window.__spellCast,
     serverTrace:p?.nobbyLastSpell};
   },{click,targetId:foe.id});
   throw new Error('Enemy click did not emit a spell: '+JSON.stringify(diagnostics));
  });
  // A magical projectile must be server-acknowledged BEFORE it is visible.
  assert.ok(await page.evaluate(()=>window.__spellServer.some(e=>e.stage==='accepted')),
    'server never acknowledged the cast');
  assert.ok(await page.evaluate(()=>window.__spellCast.some(e=>e.confirmed===true)),
    'client spawned an unconfirmed projectile');
  // The launch event is reliable even after the projectile DOM element is gone.
  assert.ok(await page.evaluate(()=>window.__spellFX.some(e=>e.phase==='launch')),
    'magical orb launch was not emitted');
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
   const trace=await page.evaluate(()=>{
     const p=Object.values(window.__spellReview.server.subRoom.players())[0];
     return p?.nobbyLastSpell;
   });
   throw new Error('Server did not apply spell damage: '+JSON.stringify({...details,serverTrace:trace}));
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
  const impact=await page.evaluate(()=>{
   const p=Object.values(window.__spellReview.server.subRoom.players())[0];
   return p.nobbyLastSpell;
  });
  assert.equal(impact.stage,'impact','spell must reach server impact: '+JSON.stringify(impact));
  assert.equal(impact.reason,'hit','server must report HP damage: '+JSON.stringify(impact));
  await page.waitForFunction(()=>window.__spellServer.some(e=>e.stage==='impact'&&e.reason==='hit'),
    {},{timeout:2000});
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
