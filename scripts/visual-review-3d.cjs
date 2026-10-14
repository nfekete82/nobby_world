// Exercise the actual 3D renderer and input projection in real Chrome.
// The inspection hook is injected into intercepted HTML; no debug globals ship.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 const html=fs.readFileSync('index.html','utf8').replace('restoreGame();updateZoneUI();',`restoreGame();updateZoneUI();window.__review={hero,resources,enemies,worldRun,enterNextWorld,updateWorldProgress,hurtMonster,REGIONS,worldPaths,merchant,fireballs,enemyShots,loot,trees,rocks,details,river,riverCenter,lakeContains,riverContains,structures,routeTo,canTraverse,render,update,saveGame,castFireball,provokeMonster,get renderer(){return sceneRenderer},get route(){return route},freeze(){paused=true},setTime(t){time=t},zone:updateZoneUI};`);
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[],missing=[],warnings=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text())});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
 await page.route('http://127.0.0.1:8093/',r=>r.fulfill({body:html,contentType:'text/html'}));
 await page.goto('http://127.0.0.1:8093/');await page.waitForFunction(()=>window.__review?.renderer?.textureReady,{timeout:30000});await page.waitForTimeout(800);await page.evaluate(()=>window.__review.freeze());
 fs.mkdirSync('artifacts/worlds',{recursive:true});
 const pathAt=x=>1205+178*Math.sin(x/560)+68*Math.sin(x/203);
 const sceneDiagnostics={};
 const scenes=[['village',1600,pathAt(1600)],['bridge',1965,pathAt(2020)+45],['forest-boss',2810,pathAt(2860)-90],['lake',980,1850],['plateau',1300,580],['desert',4590,pathAt(4590)],['gardens',1500,pathAt(1500)+2650],['highlands',7300,2500],['dusk',9200,pathAt(9200)+2450]];
 for(const[name,x,y]of scenes){await page.evaluate(({x,y})=>{const a=window.__review;a.hero.x=x;a.hero.y=y;a.hero.walking=false;a.update(.001);a.zone();a.render();},{x,y});await page.waitForTimeout(100);await page.screenshot({path:`artifacts/worlds/${name}.png`});sceneDiagnostics[name]=await page.evaluate(()=>window.__review.renderer.diagnostics());}
 const diagnostics=await page.evaluate(()=>window.__review.renderer.diagnostics());assert.equal(diagnostics.engine,'Three.js');assert.equal(diagnostics.texturesReady,true);assert.ok(diagnostics.models===82);assert.ok(diagnostics.trees<=210);
 const placement=await page.evaluate(()=>{const a=window.__review;return {landInWater:[...a.trees,...a.rocks,...a.details].filter(p=>a.lakeContains(p.x,p.y)||a.riverContains(p.x,p.y)).length,bowsOnly:a.enemies.filter(m=>m.ranged).every(m=>m.weapon==='bow'&&m.kind==='raider')};});assert.deepEqual(placement,{landInWater:0,bowsOnly:true});
 await page.evaluate(({x,y})=>{const a=window.__review;a.hero.x=x;a.hero.y=y;a.render();},{x:1600,y:pathAt(1600)});
 const start=await page.evaluate(()=>window.__review.hero.x);await page.keyboard.down('d');await page.evaluate(()=>{for(let i=0;i<10;i++)window.__review.update(.05);window.__review.render()});await page.keyboard.up('d');const end=await page.evaluate(()=>window.__review.hero.x);assert.ok(end>start+60,'WASD moves the actual simulation');await page.screenshot({path:'artifacts/worlds/run.png'});
 // Use projected 3D model coordinates for a real mouse click, not the legacy canvas transform.
 await page.keyboard.press('2');const clickTarget=await page.evaluate(()=>{const a=window.__review,m=a.enemies.find(m=>m.kind==='slime');a.render();const p=a.renderer.project(m.x,m.y,.35);return {id:m.id,x:(p[0]*.5+.5)*innerWidth,y:(-.5*p[1]+.5)*innerHeight,hp:m.hp};});
 await page.mouse.click(clickTarget.x,clickTarget.y);assert.ok(await page.evaluate(()=>window.__review.fireballs.some(p=>p.spell==='ice')),'3D raycast clicking a slime casts frost');
 await page.evaluate(()=>{for(let i=0;i<36;i++)window.__review.update(.05);window.__review.render()});assert.equal(await page.evaluate(id=>window.__review.enemies.find(m=>m.id===id).hp,clickTarget.id),clickTarget.hp,'frost remains zero damage');
 await page.keyboard.press('1');const orbTarget=await page.evaluate(id=>{const a=window.__review,m=a.enemies.find(m=>m.id===id);a.render();const p=a.renderer.project(m.x,m.y,.35);return {x:(p[0]*.5+.5)*innerWidth,y:(-.5*p[1]+.5)*innerHeight};},clickTarget.id);await page.mouse.click(orbTarget.x,orbTarget.y);assert.ok(await page.evaluate(()=>window.__review.fireballs.some(p=>p.spell==='fire')),'arcane click works');await page.screenshot({path:'artifacts/worlds/combat.png'});
 await page.evaluate(({x,y})=>{const a=window.__review;a.hero.x=x;a.hero.y=y;a.hero.walking=false;a.render();},{x:1600,y:pathAt(1600)});
 await page.keyboard.press('k');assert.equal(await page.locator('#map-overlay').isVisible(),true);await page.screenshot({path:'artifacts/worlds/map.png'});await page.keyboard.press('Escape');
 await page.keyboard.press('b');assert.equal(await page.locator('#shop-overlay').isVisible(),true);await page.screenshot({path:'artifacts/worlds/shop.png'});await page.keyboard.press('Escape');await page.keyboard.press('i');assert.equal(await page.locator('#inventory-overlay').isVisible(),true);await page.screenshot({path:'artifacts/worlds/inventory.png'});await page.keyboard.press('Escape');
 await page.evaluate(()=>{window.__review.resources.health=50;window.__review.resources.mana=100});await page.locator('#ability-heal').click();assert.equal(await page.evaluate(()=>window.__review.resources.health),85);await page.evaluate(()=>window.__review.render());await page.screenshot({path:'artifacts/worlds/heal.png'});
 // Ground projection round-trip, bridge path and stable geometry allocation.
 const projection=await page.evaluate(()=>{const a=window.__review,x=a.hero.x+70,y=a.hero.y+60,p=a.renderer.project(x,y,0),q=a.renderer.pick((p[0]*.5+.5)*innerWidth,(-p[1]*.5+.5)*innerHeight);return {dx:Math.abs(q.x-x),dy:Math.abs(q.y-y)};});assert.ok(projection.dx<1&&projection.dy<1);
 const plateauPick=await page.evaluate(()=>{const a=window.__review;a.hero.x=1300;a.hero.y=580;a.render();const x=1300,y=620,h=a.renderer.height(x,y),p=a.renderer.project(x,y,h),q=a.renderer.pick((p[0]*.5+.5)*innerWidth,(-p[1]*.5+.5)*innerHeight);return {dx:Math.abs(q.x-x),dy:Math.abs(q.y-y)};});assert.ok(plateauPick.dx<1&&plateauPick.dy<1,'plateau edge picks the elevated mesh');
 await page.evaluate(()=>{const a=window.__review;a.hero.x=1600;a.hero.y=1205+178*Math.sin(1600/560)+68*Math.sin(1600/203);a.render()});
 const memory=await page.evaluate(()=>{const a=window.__review;const before=a.renderer.diagnostics().geometries;for(let i=0;i<30;i++)a.render();return {before,after:a.renderer.diagnostics().geometries};});assert.equal(memory.before,memory.after);
 await page.evaluate(()=>window.__review.saveGame());const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('nobby_world_save_v1')));assert.ok(saved);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.evaluate(()=>window.__review.render());await page.screenshot({path:'artifacts/worlds/mobile.png'});await page.keyboard.press('k');assert.equal(await page.locator('#map-overlay').isVisible(),true);await page.screenshot({path:'artifacts/worlds/mobile-map.png'});await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:1440,height:960});await page.waitForTimeout(150);
 await page.evaluate(()=>{const a=window.__review;for(const m of a.enemies)a.hurtMonster(m,m.maxHp);for(let i=0;i<26;i++)a.update(.05);a.render()});
 assert.equal(await page.locator('#world-remaining').textContent(),'0 / 80 Gegner');assert.equal(await page.locator('#portal-button').isVisible(),true);
 assert.equal(await page.evaluate(()=>window.__review.renderer.diagnostics().portalActive),true);
 await page.waitForTimeout(350);await page.screenshot({path:'artifacts/worlds/portal.png'});
 const baseHP=await page.evaluate(()=>window.__review.enemies.map(m=>m.maxHp));
 await page.keyboard.press('r');await page.evaluate(()=>window.__review.render());
 assert.equal(await page.locator('#world-tier').textContent(),'WELT 2');assert.equal(await page.locator('#world-remaining').textContent(),'80 / 80 Gegner');
 const stage2=await page.evaluate(()=>({level:window.__review.worldRun.level,monsters:window.__review.enemies.map(m=>({hp:m.maxHp,level:m.level})),models:window.__review.renderer.diagnostics().models}));
 assert.ok(stage2.monsters.every((m,i)=>m.hp>baseHP[i]&&m.level===2));assert.equal(stage2.models,82);
 await page.screenshot({path:'artifacts/worlds/world-2.png'});
 // After the reset, real mesh picks must reference the newly spawned enemy objects.
 await page.evaluate(()=>{window.__review.update(.35);window.__review.render()});
 const freshTarget=await page.evaluate(()=>{const a=window.__review,m=a.enemies[0],p=a.renderer.project(m.x,m.y,.35);return{x:(p[0]*.5+.5)*innerWidth,y:(-.5*p[1]+.5)*innerHeight,hp:m.hp};});
 await page.mouse.click(freshTarget.x,freshTarget.y);await page.evaluate(()=>{for(let i=0;i<25;i++)window.__review.update(.05);window.__review.render()});
 assert.ok(await page.evaluate(hp=>window.__review.enemies[0].hp<hp,freshTarget.hp),'world 2 raycasts hit the new enemy instance');
 await page.evaluate(()=>{const a=window.__review;for(const m of a.enemies)a.hurtMonster(m,m.maxHp);for(let i=0;i<26;i++)a.update(.05);a.render()});const portalPoint=await page.evaluate(()=>{const a=window.__review,p=a.worldRun.portal,v=a.renderer.project(p.x,p.y,.96);return{x:(v[0]*.5+.5)*innerWidth,y:(-.5*v[1]+.5)*innerHeight};});await page.mouse.click(portalPoint.x,portalPoint.y);await page.evaluate(()=>window.__review.render());
 assert.equal(await page.locator('#world-tier').textContent(),'WELT 3');
 await page.evaluate(()=>window.__review.saveGame());await page.reload();await page.waitForFunction(()=>window.__review?.renderer?.textureReady);await page.evaluate(()=>window.__review.freeze());
 assert.equal(await page.locator('#world-tier').textContent(),'WELT 3');assert.equal(await page.locator('#world-remaining').textContent(),'80 / 80 Gegner');
 assert.deepEqual(missing,[]);assert.deepEqual(errors,[]);
 fs.writeFileSync('artifacts/worlds/report.json',JSON.stringify({browser:'Chrome/WebGL via Playwright',diagnostics,stage2,sceneDiagnostics,placement,projection,plateauPick,memory,scenes:scenes.map(s=>s[0]),checks:['genuine WebGL meshes, shadows and loaded ImageGen material textures','WASD movement','real 3D mouse selection for frost and arcane','frost zero damage','shop and inventory','healing 50→85','save write','screen/world projection round-trip including elevated plateau','no new geometries per frame','all land props outside water','only bow carriers fire','390px mobile viewport and readable mobile map','world map opens and closes','last kill opens a real 3D portal; keyboard and real mesh click both enter','world 2 and 3 transitions strengthen all 80 enemies','3D raycasting targets fresh enemies after transition','world 3 survives page reload'],errors,missing,warnings},null,2)+'\n');await browser.close();console.log('3D Chrome review passed.');
})().catch(e=>{console.error(e);process.exit(1)});
