const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
  const url=process.env.REVIEW_URL||'http://localhost:8088/';
  fs.mkdirSync('artifacts/rpgjs',{recursive:true});
  await page.goto(url);
  await page.waitForSelector('canvas');
  await page.waitForTimeout(2000);
  assert.equal(await page.title(),'Nobby World — RPG-JS');
  await page.screenshot({path:'artifacts/rpgjs/world.png'});
  // The engine polls keyboard input per frame; a held key represents real play.
  await page.keyboard.press('Escape',{delay:150});
  await page.getByText('Nobby',{exact:true}).waitFor();
  assert.ok((await page.locator('body').innerText()).includes('HP 741'));
  await page.screenshot({path:'artifacts/rpgjs/menu.png'});
  await page.getByText('Save',{exact:true}).click();
  await page.locator('[data-slot-index="0"]').waitFor();
  await page.locator('[data-slot-index="0"]').click();
  await page.waitForTimeout(500);
  const storage=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  assert.ok(Object.keys(storage).some(k=>k.includes('nobby_world_rpgjs_v1')),'engine save uses the new namespace');
  await page.keyboard.press('Escape',{delay:150});
  await page.waitForTimeout(200);
  // Reload resets the unsaved session to the spawn; approaching the NPC proves
  // that actual keyboard movement and action collision detection both work.
  await page.reload();await page.waitForSelector('canvas');await page.waitForTimeout(1500);
  await page.keyboard.down('ArrowDown');await page.waitForTimeout(600);await page.keyboard.up('ArrowDown');
  await page.keyboard.press('Space',{delay:150});
  await page.getByText('Willkommen, Nobby! Hier beginnt unsere neue Welt.',{exact:true}).waitFor();
  await page.screenshot({path:'artifacts/rpgjs/dialog.png'});
  await page.keyboard.press('Space',{delay:150});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
  await page.screenshot({path:'artifacts/rpgjs/mobile.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.writeFileSync('artifacts/rpgjs/report.json',JSON.stringify({url,browser:'Google Chrome / Playwright',checks:['2D map and sprites load','default menu shows Nobby and initialized HP','save slot writes new storage namespace','keyboard movement reaches NPC','Space opens German NPC dialog','390px viewport renders'],errors,missing},null,2)+'\n');
  await browser.close();console.log('RPG-JS browser review passed.');
})().catch(e=>{console.error(e);process.exit(1)});
