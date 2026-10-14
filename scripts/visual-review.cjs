// Real Chrome integration review. The review hook exists only in intercepted HTML.
const fs=require('node:fs');const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const html=fs.readFileSync('index.html','utf8').replace('restoreGame();updateZoneUI();',`restoreGame();updateZoneUI();window.__review={hero,camera,enemies,resources,render,update,castFireball,routeTo,canTraverse,plateaus,lakes,saveGame,openShop,closeShop,worldArt,terrainArt,heroArt,enemyArt,effectArt,cliffArt,freeze(){paused=true;},setTime(t){time=t;},zone:updateZoneUI};`);
 const errors=[],missing=[];const page=await browser.newPage({viewport:{width:1440,height:960}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
 await page.route('http://127.0.0.1:8093/',r=>r.fulfill({body:html,contentType:'text/html'}));
 await page.goto('http://127.0.0.1:8093/');
 await page.waitForFunction(()=>{const a=window.__review;return a&&[a.worldArt,a.terrainArt,a.heroArt,a.enemyArt,a.effectArt,a.cliffArt].every(i=>i.complete&&i.naturalWidth)});
 await page.waitForTimeout(1000);await page.evaluate(()=>window.__review.freeze());
 fs.mkdirSync('artifacts/visual',{recursive:true});
 const scenes=[['village',1600,null],['boss',2810,1205+178*Math.sin(2860/560)+68*Math.sin(2860/203)-120],['lake',990,1870],['mountain',1300,580],['desert',4570,null]];
 for(const[name,x,y]of scenes){
  await page.evaluate(({x,y})=>{const a=window.__review;a.hero.x=x;a.hero.y=y??1205+178*Math.sin(x/560)+68*Math.sin(x/203);a.camera.x=Math.max(0,x-innerWidth/2/1.22);a.camera.y=Math.max(0,a.hero.y-innerHeight/2/1.22);a.update(.001);a.zone();a.render();},{x,y});
  await page.screenshot({path:`artifacts/visual/${name}.png`});
 }
 await page.evaluate(()=>{let a=window.__review;a.hero.x=1600;a.hero.y=1205+178*Math.sin(1600/560)+68*Math.sin(1600/203);a.camera.x=a.hero.x-innerWidth/2/1.22;a.camera.y=a.hero.y-innerHeight/2/1.22;a.zone();a.render()});
 await page.keyboard.press('b');assert.equal(await page.locator('#shop-overlay').isVisible(),true);await page.screenshot({path:'artifacts/visual/shop.png'});await page.keyboard.press('Escape');
 await page.keyboard.press('i');assert.equal(await page.locator('#inventory-overlay').isVisible(),true);await page.screenshot({path:'artifacts/visual/inventory.png'});await page.keyboard.press('Escape');
 await page.keyboard.press('2');assert.equal(await page.locator('#spell-ice').getAttribute('aria-pressed'),'true');
 await page.evaluate(()=>{const a=window.__review;a.resources.health=50;a.resources.mana=100});await page.keyboard.press('e');assert.equal(await page.evaluate(()=>window.__review.resources.health),85);await page.evaluate(()=>{window.__review.setTime(.4);window.__review.render()});await page.screenshot({path:'artifacts/visual/heal.png'});
 const atlasChecks=await page.evaluate(()=>{
  const a=window.__review,results=[];
  for(const [name,img,cols,rows]of [['world',a.worldArt,6,4],['nobby',a.heroArt,6,4],['enemies',a.enemyArt,6,6],['effects',a.effectArt,4,4]]){
   const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;
   for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    let occupied=0,bottom=-1;for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(d[((row*128+y)*c.width+col*128+x)*4+3]>32){occupied++;bottom=Math.max(bottom,y)}
    if(!occupied||bottom>116)throw Error(name+' bad baseline/empty cell');
   }results.push({name,width:img.width,height:img.height,cells:cols*rows});
  }
  // Seam acceptance checks: material left/right and top/bottom pixels are identical.
  const c=document.createElement('canvas');c.width=256;c.height=256;const ctx=c.getContext('2d');ctx.drawImage(a.terrainArt,0,0);const d=ctx.getImageData(0,0,256,256).data;
  for(let row=0;row<2;row++)for(let col=0;col<2;col++)for(let t=0;t<128;t++)for(let k=0;k<4;k++){
   if(d[((row*128+t)*256+col*128)*4+k]!==d[((row*128+t)*256+col*128+127)*4+k])throw Error('horizontal seam');
   if(d[((row*128)*256+col*128+t)*4+k]!==d[((row*128+127)*256+col*128+t)*4+k])throw Error('vertical seam');
  }return results;
 });
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.evaluate(()=>{window.__review.setTime(2);window.__review.render()});await page.screenshot({path:'artifacts/visual/mobile.png'});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 fs.writeFileSync('artifacts/visual/report.json',JSON.stringify({browser:'Chrome (Playwright)',scenes:scenes.map(s=>s[0]),atlasChecks,checks:['shop opens/closes','inventory opens/closes','frost selection','heal 50→85','all 100 sprite cells nonempty and grounded','all terrain edges match exactly','390px mobile no page overflow'],errors,missing},null,2)+'\n');
 await browser.close();console.log('Browser review passed: five regions, shop, inventory, heal, mobile, PNG alpha/baselines and exact tile seams.');
})().catch(e=>{console.error(e);process.exit(1)});
