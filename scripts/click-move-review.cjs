const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const ensureDevServer=require('./ensure-dev-server.cjs');
(async()=>{
 const stop=await ensureDevServer();
 let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
  await page.route('**/src/modules/main/display.ts*',async route=>{
   const response=await route.fetch();
   const original=await response.text();
   const body=original.replace('onStep(engine) {','onStart(engine) { window.__clickReview={engine}; }, onStep(engine) {');
   assert.notEqual(body,original,'test-only browser engine hook not applied');
   await route.fulfill({response,body});
  });
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForFunction(()=>window.__clickReview?.engine?.getCurrentPlayer()&&
   document.querySelector('#nobby-hud')?.hidden===false,{},{timeout:20000});
  const before=await page.evaluate(()=>{
   const e=window.__clickReview.engine,p=e.getCurrentPlayer();
   const find=node=>{if(node?.toWorld&&node?.toScreen)return node;
    for(const child of node?.children??[]){const v=find(child);if(v)return v}};
   const v=find(e.canvasApp.stage);
   if(!v)throw Error('RPG-JS viewport not found');
   const current={x:p.x(),y:p.y()};
   const dest={x:current.x+64,y:current.y};
   const canvas=e.renderer.canvas,rect=canvas.getBoundingClientRect();
   const spot=v.toScreen(dest.x+16,dest.y+12);
   return {current,dest,click:{x:rect.left+spot.x,y:rect.top+spot.y}};
  });
  await page.mouse.click(before.click.x,before.click.y);
  await page.waitForFunction(x=>window.__clickReview.engine.getCurrentPlayer().x()>=x+24,
   before.current.x,{timeout:12000});
  await page.waitForTimeout(800);
  const after=await page.evaluate(()=>{
   const e=window.__clickReview.engine,p=e.getCurrentPlayer();
   return {x:p.x(),y:p.y()};
  });
  assert.ok(after.x>before.current.x+24,'click did not move player');
  assert.ok(Math.abs(after.y-before.current.y)<35,'player deviated from path');
  assert.ok(Math.abs(after.x-before.dest.x)<36,'player did not approach click');
  assert.deepEqual(errors,[]);
  assert.deepEqual(missing,[]);
  console.log('Click-to-move browser review passed.',{from:before.current,to:after,target:before.dest});
 }finally{
  if(browser)await browser.close();
  await stop();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
