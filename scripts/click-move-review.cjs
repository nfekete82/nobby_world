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
  await page.addInitScript(()=>{window.__RPGJS_MOBILE_DEBUG__=true;});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
  await page.route('**/src/modules/main/display.ts*',async route=>{
   const response=await route.fetch();
   const original=await response.text();
   const body=original.replace('onStep(engine) {', 'onStep(engine) { if(engine.sceneMap.data()?.id && engine.getCurrentPlayer() && engine.activeKeyboardControls?.()) window.__clickReview={engine};');
   assert.notEqual(body,original,'test-only browser engine hook not applied');
   await route.fulfill({response,body});
  });
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForFunction(()=>window.__clickReview?.engine?.getCurrentPlayer()&&
   document.querySelector('#nobby-hud')?.hidden===false,{},{timeout:20000});
  await page.evaluate(()=>{
    window.__nobbyClickEvents=[];
    window.__nobbyClickDiagnostics=[];
    window.__nobbyControlEvents=[];
    window.addEventListener('nobby:move-control',event=>window.__nobbyControlEvents.push(event.detail));
    window.addEventListener('nobby:move-target',event=>window.__nobbyClickEvents.push(event.detail));
    window.addEventListener('nobby:move-diagnostic',event=>window.__nobbyClickDiagnostics.push(event.detail));
  });
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
  const hit=await page.evaluate(({x,y})=>{
    const canvas=window.__clickReview.engine.renderer.canvas;
    return {insideCanvas:document.elementFromPoint(x,y)===canvas,at:{x,y}};
  },before.click);
  assert.equal(hit.insideCanvas,true,'test point is not on game canvas: '+JSON.stringify(hit));
  await page.mouse.click(before.click.x,before.click.y);
  await page.waitForFunction(()=>window.__nobbyClickEvents.length>0,{},{timeout:4000})
    .catch(async()=>{
      const detail=await page.evaluate(()=>{
        const e=window.__clickReview.engine;
        return {diagnostics:window.__nobbyClickDiagnostics,
          mapId:e.sceneMap.data()?.id,hasPlayer:!!e.getCurrentPlayer(),
          canvasTag:e.renderer?.canvas?.tagName,
          viewportChildren:e.canvasApp?.stage?.children?.length,
          hudHidden:document.querySelector('#nobby-hud')?.hidden};
      });
      throw new Error('Left click was not accepted: '+JSON.stringify(detail));
    });
  const accepted=await page.evaluate(()=>window.__nobbyClickEvents.at(-1));
  assert.ok(accepted.waypoints>0,'A* did not accept a route: '+JSON.stringify(accepted));
  assert.equal(accepted.inputMode,'native-keyboard','Mouse must use normal WASD controls');
  await page.waitForFunction(()=>window.__nobbyControlEvents.length>0,{},{timeout:3000});
  await page.waitForFunction(()=>{
    const events=window.__RPGJS_MOBILE_DEBUG_EVENTS__||[];
    return events.some(e=>e.type==='walk:set');
  },{},{timeout:5000}).catch(async()=>{
    const debug=await page.evaluate(()=>({
      controls:window.__nobbyControlEvents,
      frames:(window.__RPGJS_MOBILE_DEBUG_EVENTS__||[]).slice(-12)
    }));
    throw new Error('Native walk animation did not start: '+JSON.stringify(debug));
  });
  await page.waitForFunction(x=>window.__clickReview.engine.getCurrentPlayer().x()>=x+24,
   before.current.x,{timeout:12000}).catch(async()=>{
    const actual=await page.evaluate(()=>{
      const e=window.__clickReview.engine,p=e.getCurrentPlayer();
      return {client:{x:p.x(),y:p.y()},accepted:window.__nobbyClickEvents};
    });
    throw new Error('Click route accepted but player did not move: '+JSON.stringify(actual));
   });
  await page.waitForTimeout(800);
  const after=await page.evaluate(()=>{
   const e=window.__clickReview.engine,p=e.getCurrentPlayer();
   return {x:p.x(),y:p.y()};
  });
  assert.ok(after.x>before.current.x+24,'click did not move player');
  assert.ok(Math.abs(after.y-before.current.y)<35,'player deviated from path');
  assert.ok(Math.abs(after.x-before.dest.x)<36,'player did not approach click');
  // Physical arrow-key chords must also use native walk frames on BOTH axes.
  await page.evaluate(()=>{ window.__RPGJS_MOBILE_DEBUG_EVENTS__=[]; });
  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(450);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowUp');
  const chord=await page.evaluate(()=>({
    bound:!!window.__clickReview.engine.activeKeyboardControls?.()?.keyboard?.getControl?.('up_right'),
    inputs:(window.__RPGJS_MOBILE_DEBUG_EVENTS__||[])
      .filter(e=>e.type==='movement:input').map(e=>e.input)
  }));
  assert.equal(chord.bound,true,'Native up+right combo must be registered');
  assert.ok(chord.inputs.includes('up')&&chord.inputs.includes('right'),
    'Diagonal chord must drive both movement axes: '+JSON.stringify(chord));
  assert.deepEqual(errors,[]);
  assert.deepEqual(missing,[]);
  console.log('Click-to-move browser review passed.',{from:before.current,to:after,target:before.dest,route:accepted,controls:await page.evaluate(()=>window.__nobbyControlEvents),chord});
 }finally{
  if(browser)await browser.close();
  await stop();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
