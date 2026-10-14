import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

// Run the real standalone game script against a minimal fake Canvas/DOM.
// No browser, downloads, Docker, or commercial Tiny Swords files required.
const html = readFileSync(join(import.meta.dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert.ok(script, 'index.html must include the game script');
const bootAnchor = 'drawGround();generateForest();buildNav();spawnMonsters();resize();';
assert.ok(script.includes(bootAnchor), 'game initialization changed; adjust test hook');
const instrumented = script.replace(
  bootAnchor,
  bootAnchor + '\nwindow.__test={enemies,fireballs,resources,progress,loot,hero,merchant,WORLD,BIOMES,trees,details,biomeAt,pathAt,drawAdventureEnemy,drawForestGoblinSprite,forestGoblinSheet,bossZones,enemyShots,equipment,equipped,bag,selectSpell,openInventory,closeInventory,toggleEquipment,drinkPotion,spellSpecs,camera,update,castFireball,provokeMonster,routeTo,hurtMonster,grantXP,damageHero,drawCombatEffects,drawMerchant,openShop,closeShop,buyItem,saveGame,route:()=>route,target:()=>target,shopState:()=>shopOpen};'
);

function boot(initialSave = null) {
  const stored = new Map();
  if(initialSave)stored.set('nobby_world_save_v1', JSON.stringify(initialSave));
  const callbacks = new Map();
  const gradient = () => ({ addColorStop() {} });
  const drawCalls = [];
  const ctx = new Proxy({
    drawImage(...args) { drawCalls.push(args); },
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    createPattern() { return '#263'; },
  }, {
    get(obj, key) { return key in obj ? obj[key] : () => {}; },
    set(obj, key, value) { obj[key] = value; return true; }
  });
  const canvas = {
    getContext() { return ctx; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 800 }; },
    addEventListener(name, callback) { callbacks.set('canvas.' + name, callback); },
    style: {}
  };
  const elements = new Map([['world', canvas]]);
  const fakeElement = () => ({
    classList: { add() {} }, style: {}, hidden: false, focus() {}, setAttribute() {}, remove() {},
    listeners:{},addEventListener(name,fn) {this.listeners[name]=fn;},
    click(){this.listeners.click?.();},getContext() { return ctx; }
  });
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, fakeElement());
      return elements.get(id);
    },
    createElement() { return fakeElement(); },
    addEventListener(name, cb) { callbacks.set('document.' + name, cb); },
    documentElement: { requestFullscreen() { return Promise.resolve(); } }
  };
  const window = {
    addEventListener(name, cb) { callbacks.set('window.' + name, cb); }
  };
  class Image { set src(value) { this.url = value; } }
  const localStorage = {
    getItem(key) { return stored.get(key) ?? null; },
    setItem(key, value) { stored.set(key, value); }
  };
  vm.runInNewContext(instrumented, {
    console, document, window, Image, localStorage, innerWidth: 1280, innerHeight: 800,
    devicePixelRatio: 1, performance: { now: () => 0 },
    setTimeout() {}, requestAnimationFrame() {}
  }, { timeout: 10000 });
  const g = window.__test;
  assert.ok(g, 'game test hook missing');
  return {
    g, stored, drawCalls,
    click(x,y,button=0) {
      callbacks.get('canvas.pointerdown')({
        pointerType:'mouse', button,
        clientX:(x-g.camera.x)*1.22,
        clientY:(y-g.camera.y)*1.22,
        preventDefault() {}
      });
    },
    keydown(key) { callbacks.get('window.keydown')({key,repeat:false,preventDefault() {}}); }
  };
}

test('forest combat spawns healthy enemies', () => {
  const {g}=boot();
  assert.equal(g.enemies.length,22);
  assert.equal(g.enemies.filter(e=>e.kind==='slime').length,9);
  assert.ok(g.enemies.every(e => e.hp===e.maxHp && e.hp>0));
  assert.equal(g.resources.health,100);
  assert.equal(g.resources.mana,100);
});

test('left click on a monster shoots once, spends mana, hits and does not pathfind', () => {
  const {g,click}=boot();
  const m=g.enemies[0];
  click(m.x,m.y-26);
  click(m.x,m.y-26); // rate limited
  assert.equal(g.fireballs.length,1);
  assert.equal(g.resources.mana,91);
  assert.equal(g.target(),null);
  for(let i=0;i<30;i++)g.update(.05);
  assert.equal(m.hp,40);
  assert.equal(g.fireballs.length,0);
});

test('clicking ground moves; right mouse button does not shoot', () => {
  const {g,click}=boot();
  const m=g.enemies[0];
  click(m.x,m.y-26,2);
  assert.equal(g.fireballs.length,0);
  const x=g.hero.x+80,y=g.hero.y;
  click(x,y);
  assert.ok(g.route().length>0);
  assert.equal(g.fireballs.length,0);
});

test('no mana means no attack; E heals only with enough mana', () => {
  const {g,click,keydown}=boot();
  const m=g.enemies[0];
  g.resources.mana=8;
  click(m.x,m.y-26);
  assert.equal(g.fireballs.length,0);
  g.resources.health=42;
  keydown('e');
  assert.equal(g.resources.health,42);
  g.resources.mana=25;
  keydown('e');
  assert.equal(g.resources.health,77);
  assert.equal(g.resources.mana,0);
});

test('monsters damage the hero; defeated monsters respawn', () => {
  const {g}=boot();
  const m=g.enemies[0];
  m.x=g.hero.x+25;m.y=g.hero.y;m.attackAt=0;
  g.update(.1);
  assert.equal(g.resources.health,92);
  g.hurtMonster(m);g.hurtMonster(m);g.hurtMonster(m);
  assert.equal(m.hp,0);
  // Hold the hero away from the monster until respawn.
  g.hero.x=g.hero.x+600;
  for(let i=0;i<204;i++)g.update(.05);
  assert.equal(m.hp,m.maxHp);
});

test('monsters grant experience and scatter collectible treasure', () => {
  const {g}=boot();
  const m=g.enemies[0];
  for(let i=0;i<3;i++)g.hurtMonster(m);
  assert.equal(m.hp,0);
  assert.equal(g.progress.xp,15);
  assert.equal(g.progress.kills,1);
  assert.ok(g.loot.some(item=>item.kind==='gold'));
  const coin=g.loot.find(item=>item.kind==='gold');
  coin.x=g.hero.x;coin.y=g.hero.y-12;
  g.update(.05);
  assert.ok(g.progress.gold>=1);
});

test('third kill spawns a blue mana orb', () => {
  const {g}=boot();
  for(let i=0;i<3;i++){
    const m=g.enemies[i];
    for(let j=0;j<3;j++)g.hurtMonster(m);
  }
  assert.ok(g.loot.some(item=>item.kind==='mana'));
  const orb=g.loot.find(item=>item.kind==='mana');
  g.resources.mana=30;
  orb.x=g.hero.x;orb.y=g.hero.y-12;
  g.update(.05);
  assert.ok(g.resources.mana>=48);
});

test('level up increases max HP/mana and restores resources', () => {
  const {g}=boot();
  g.resources.health=20;g.resources.mana=5;
  g.grantXP(100);
  assert.equal(g.progress.level,2);
  assert.equal(g.progress.xp,60);
  assert.equal(g.resources.maxHealth,110);
  assert.equal(g.resources.maxMana,105);
  assert.equal(g.resources.health,110);
  assert.equal(g.resources.mana,105);
});

test('leash returns slimes far from their territory', () => {
  const {g}=boot();
  const m=g.enemies[0];
  m.x=m.homeX+420;m.y=m.homeY;
  g.update(.05);
  assert.equal(m.state,'return');
});

test('spell cast visual effects can be drawn without sprite assets', () => {
  const {g,click}=boot();
  const m=g.enemies[0];
  click(m.x,m.y-26);
  assert.doesNotThrow(()=>g.drawCombatEffects());
});

test('Galdor merchant opens nearby, freezes combat and closes cleanly', () => {
  const {g}=boot();
  g.hero.x=g.merchant.x;g.hero.y=g.merchant.y+80;
  assert.equal(g.openShop(),true);
  assert.equal(g.shopState(),true);
  const hp=g.resources.health;
  const m=g.enemies[0];m.x=g.hero.x+25;m.y=g.hero.y;m.attackAt=0;
  g.update(.2);
  assert.equal(g.resources.health,hp);
  g.closeShop();
  assert.equal(g.shopState(),false);
});

test('permanent focus purchase spends gold, boosts fireball and blocks duplicate buys', () => {
  const {g,stored}=boot();
  g.hero.x=g.merchant.x;g.hero.y=g.merchant.y+80;
  g.progress.gold=20;g.openShop();
  assert.equal(g.buyItem('focus'),true);
  assert.equal(g.progress.gold,8);
  assert.equal(g.equipment.focus,true);
  assert.equal(g.buyItem('focus'),false);
  assert.ok(stored.has('nobby_world_save_v1'));
  const monster=g.enemies[0];g.hurtMonster(monster);
  assert.equal(monster.hp,30);
});

test('boots and charm are one-time purchases with immediate bonuses', () => {
  const {g}=boot();
  g.hero.x=g.merchant.x;g.hero.y=g.merchant.y+80;
  g.progress.gold=50;g.openShop();
  assert.equal(g.buyItem('boots'),true);
  assert.equal(g.buyItem('charm'),true);
  assert.equal(g.progress.gold,25);
  assert.equal(g.equipment.boots,true);
  assert.equal(g.resources.maxHealth,125);
  assert.equal(g.resources.health,125);
});

test('save restores level, XP, gold, equipment and resources', () => {
  const {g,stored}=boot();
  g.progress.level=4;g.progress.xp=25;g.progress.gold=37;
  g.equipment.focus=true;g.equipment.charm=true;g.equipped.focus=true;g.equipped.charm=true;
  g.resources.maxHealth=155;g.resources.maxMana=115;
  g.resources.health=90;g.resources.mana=60;
  assert.equal(g.saveGame(),true);
  const loaded=JSON.parse(stored.get('nobby_world_save_v1'));
  const next=boot(loaded).g;
  assert.equal(next.progress.level,4);
  assert.equal(next.progress.xp,25);
  assert.equal(next.progress.gold,37);
  assert.equal(next.equipment.focus,true);
  assert.equal(next.equipment.charm,true);
  assert.equal(next.resources.maxHealth,155);
  assert.equal(next.resources.health,90);
  assert.equal(next.resources.mana,60);
});

test('tampered save values are safely clamped and unknown equipment is ignored', () => {
  const {g}=boot({
    version:1, progress:{level:999,xp:-10,gold:-200,kills:-1},
    equipment:{focus:true,boots:'yes',charm:true},
    resources:{health:999999,mana:-5},hero:{x:-500,y:999999}
  });
  assert.equal(g.progress.level,100);
  assert.equal(g.progress.xp,0);
  assert.equal(g.progress.gold,0);
  assert.equal(g.equipment.focus,true);
  assert.equal(g.equipment.boots,false);
  assert.equal(g.resources.health,g.resources.maxHealth);
  assert.equal(g.resources.mana,0);
});

test('merchant sprite renderer works even when Tiny Swords are not loaded', () => {
  const {g}=boot();
  assert.doesNotThrow(()=>g.drawMerchant());
});

test('B opens the shop from spawn, Escape closes, and navigation remains usable', () => {
  const {g,keydown,click}=boot();
  keydown('b');
  assert.equal(g.shopState(),true);
  const before=g.hero.x;
  g.update(.1);
  assert.equal(g.hero.x,before);
  keydown('escape');
  assert.equal(g.shopState(),false);
  click(g.hero.x-80,g.hero.y);
  assert.ok(g.route().length>0);
});

test('Frost slow consumes 14 mana but deals absolutely no damage or XP', () => {
  const {g,click}=boot();const m=g.enemies[0];
  g.equipment.focus=true;g.equipped.focus=true; // Focus must not add frost damage.
  assert.equal(g.selectSpell('ice'),true);click(m.x,m.y-26);
  assert.equal(g.resources.mana,86);
  assert.equal(g.fireballs[0].spell,'ice');
  assert.equal(g.fireballs[0].damage,0);
  for(let i=0;i<30;i++)g.update(.05);
  assert.equal(m.hp,66);
  assert.equal(g.progress.kills,0);
  assert.equal(g.progress.xp,0);
  assert.ok(m.slowUntil>1.5);
});

test('only two spells are available and the removed third spell cannot be selected', () => {
  const {g,keydown}=boot();
  assert.equal(Object.keys(g.spellSpecs).length,2);
  assert.equal(g.spellSpecs.fire.damage,26);
  assert.equal(g.spellSpecs.ice.damage,0);
  assert.equal(g.selectSpell('nova'),false);
  keydown('3');
  assert.equal(g.selectSpell('fire'),true);
  assert.ok(!html.includes('id="spell-nova"'));
});

test('slimes move faster normally but become significantly slower when frozen', () => {
  const normal=boot().g;
  const a=normal.enemies[0];
  assert.ok(a.speed>=78,'base enemy speed must exceed previous 43-61');
  a.x=normal.hero.x-160;a.y=normal.hero.y;
  a.homeX=a.x;a.homeY=a.y;
  normal.update(.1);const regular=a.x-(normal.hero.x-160);
  const frozen=boot().g;const b=frozen.enemies[0];
  b.x=frozen.hero.x-160;b.y=frozen.hero.y;
  b.homeX=b.x;b.homeY=b.y;
  b.slowUntil=5;
  frozen.update(.1);const slowed=b.x-(frozen.hero.x-160);
  assert.ok(regular>1,'normal slime must advance');
  assert.ok(slowed>0,'frozen slime should still move');
  assert.ok(slowed<regular*.45,'frost should reduce movement below 45%');
});

test('removed Arkanstoß in v0.6 save is migrated to arcane orb', () => {
  const {g,stored}=boot({
    version:1,progress:{level:2,xp:7,gold:12,kills:4},
    equipment:{focus:true,boots:false,charm:false},
    selectedSpell:'nova',resources:{health:105,mana:52},hero:{x:1600,y:1200}
  });
  assert.equal(g.selectSpell('nova'),false);
  assert.equal(g.resources.health,105);
  assert.equal(g.progress.gold,12);
  assert.equal(g.saveGame(),true);
  assert.equal(JSON.parse(stored.get('nobby_world_save_v1')).selectedSpell,'fire');
});

test('equipped charm can be removed and re-equipped in inventory', () => {
  const {g}=boot();g.hero.x=g.merchant.x;g.hero.y=g.merchant.y+80;
  g.progress.gold=50;g.openShop();g.buyItem('charm');g.closeShop();
  assert.equal(g.resources.maxHealth,125);
  assert.equal(g.openInventory(),true);
  g.toggleEquipment('charm');
  assert.equal(g.equipped.charm,false);assert.equal(g.resources.maxHealth,100);
  g.toggleEquipment('charm');
  assert.equal(g.equipped.charm,true);assert.equal(g.resources.maxHealth,125);
  g.closeInventory();
});

test('every fourth defeated monster drops a usable healing potion', () => {
  const {g}=boot();
  for(let i=0;i<4;i++)for(let j=0;j<3;j++)g.hurtMonster(g.enemies[i]);
  const potion=g.loot.find(item=>item.kind==='potion');assert.ok(potion);
  potion.x=g.hero.x;potion.y=g.hero.y-12;g.update(.05);
  assert.equal(g.bag.potions,1);g.resources.health=50;
  assert.equal(g.drinkPotion(),true);
  assert.equal(g.resources.health,90);assert.equal(g.bag.potions,0);
});

test('old v0.5 save migrates purchased gear to equipped slots', () => {
  const {g}=boot({version:1,progress:{level:3,xp:14,gold:26,kills:9},
    equipment:{focus:true,boots:true,charm:true},
    resources:{health:95,mana:72},hero:{x:1600,y:1200}});
  assert.equal(g.equipped.focus,true);
  assert.equal(g.equipped.boots,true);
  assert.equal(g.equipped.charm,true);
  assert.equal(g.resources.maxHealth,145);
});

test('inventory gear, potion count and spell remain in saved game', () => {
  const {g,stored}=boot();g.equipment.focus=true;g.equipment.charm=true;
  g.equipped.focus=false;g.equipped.charm=true;
  g.resources.maxHealth=125;g.bag.potions=3;g.selectSpell('ice');
  g.saveGame();
  const next=boot(JSON.parse(stored.get('nobby_world_save_v1'))).g;
  assert.equal(next.equipped.focus,false);assert.equal(next.equipped.charm,true);
  assert.equal(next.bag.potions,3);assert.equal(next.resources.maxHealth,125);
  assert.equal(next.spellSpecs.ice.cost,14);
});

test('I, Escape and M keys work without browser AudioContext', () => {
  const {g,keydown}=boot();
  keydown('i');assert.equal(g.openShop(),false);
  keydown('escape');keydown('m');keydown('2');
  assert.equal(g.selectSpell('no-such-spell'),false);
});

test('ranged spell immediately provokes a slime before the projectile hits', () => {
  const {g}=boot();const m=g.enemies[g.enemies.length-1];
  const distance=Math.hypot(m.x-g.hero.x,m.y-g.hero.y);
  assert.ok(distance>690,'test monster must be outside the old spell range');
  assert.equal(m.state,'idle');
  g.castFireball(m);
  assert.equal(g.fireballs.length,1);
  assert.equal(g.resources.mana,91);
  assert.equal(m.provoked,true);
  assert.equal(m.state,'chase');
  assert.equal(m.hp,m.maxHp,'aggro must trigger before projectile impact');
  assert.ok(g.fireballs[0].life>2.3,'long-range fireballs require extended lifetime');
  const before=Math.hypot(m.x-g.hero.x,m.y-g.hero.y);
  for(let i=0;i<10;i++)g.update(.05);
  assert.equal(m.state,'chase');
  assert.ok(m.chasePath.length>0,'monster should plan a path around trees');
  assert.ok(Math.hypot(m.x-g.hero.x,m.y-g.hero.y)<before+60);
});

test('provoked slime never resets at the old home-radius boundary', () => {
  const {g}=boot();const m=g.enemies[0];
  g.provokeMonster(m);
  m.x=m.homeX+410;
  m.y=m.homeY;
  g.update(.05);
  assert.equal(m.provoked,true);
  assert.equal(m.state,'chase','the former 390-unit home leash must not override provocation');
});

test('zero-damage frost also alerts distant enemies immediately', () => {
  const {g}=boot();const m=g.enemies[g.enemies.length-1];
  g.selectSpell('ice');
  const before=m.hp;
  g.castFireball(m);
  assert.equal(g.resources.mana,86);
  assert.equal(m.provoked,true);
  assert.equal(m.state,'chase');
  for(let i=0;i<70;i++)g.update(.05);
  assert.equal(m.hp,before,'frost still cannot harm monsters');
  assert.equal(g.progress.xp,0);
});

test('failed spell cast does not alert monsters', () => {
  const {g}=boot();const m=g.enemies[g.enemies.length-1];
  g.resources.mana=0;g.castFireball(m);
  assert.equal(m.provoked,false);
  assert.equal(g.fireballs.length,0);
});

test('defeating a provoked slime and respawning clears the chase', () => {
  const {g}=boot();const m=g.enemies[0];
  g.provokeMonster(m);
  for(let i=0;i<3;i++)g.hurtMonster(m);
  assert.equal(m.hp,0);
  g.hero.x+=560;
  for(let i=0;i<210;i++)g.update(.05);
  assert.equal(m.hp,m.maxHp);
  assert.equal(m.provoked,false);
});

test('an unprovoked far-away slime still returns to its own territory', () => {
  const {g}=boot();const m=g.enemies[0];
  m.x=m.homeX+420;
  g.update(.05);
  assert.equal(m.provoked,false);
  assert.equal(m.state,'return');
});

test('expanded world preserves old start and softly separates forest, badlands and desert', () => {
  const {g}=boot();
  assert.equal(g.WORLD.w,5200);
  assert.equal(g.WORLD.h,2800);
  assert.equal(g.hero.x,1600,'player start must not jump after a map expansion');
  assert.equal(g.biomeAt(1600),'forest');
  assert.equal(g.biomeAt(3550),'badlands');
  assert.equal(g.biomeAt(4700),'desert');
  assert.ok(g.trees.length<=335);
  assert.ok(g.trees.every(t=>t.x<g.BIOMES.forestEnd));
  assert.ok(g.details.some(o=>o.type==='cactus'));
  assert.ok(g.details.some(o=>o.type==='drybush'));
});

test('new enemy classes have distinct health, damage and loot tiers', () => {
  const {g}=boot();
  const expected=['slime','goblin','raider','scarab','elite','boss'];
  for(const kind of expected)
    assert.ok(g.enemies.some(e=>e.kind===kind),'missing enemy type '+kind);
  const slime=g.enemies.find(e=>e.kind==='slime');
  const elite=g.enemies.find(e=>e.kind==='elite');
  const boss=g.enemies.find(e=>e.kind==='boss');
  assert.ok(elite.maxHp>slime.maxHp*3);
  assert.ok(boss.maxHp>elite.maxHp);
  assert.ok(boss.damage>elite.damage);
  assert.ok(boss.x<g.BIOMES.forestEnd);
});

test('all enemy variants render even without Tiny Swords sprite images', () => {
  const {g}=boot();
  for(const enemy of g.enemies)
    assert.doesNotThrow(()=>g.drawAdventureEnemy(enemy));
});

test('boss second phase begins below half HP and draws a visible health bar nearby', () => {
  const {g}=boot(),boss=g.enemies.find(e=>e.kind==='boss');
  g.hero.x=boss.x+150;g.hero.y=boss.y;
  g.hurtMonster(boss,290);
  assert.equal(boss.hp,270);
  g.update(.05);
  assert.equal(boss.bossPhase,2);
  assert.equal(boss.state,'chase');
  assert.ok(boss.speed>83);
});

test('forest boss warns before a dodgeable AoE slam', () => {
  const {g}=boot(),boss=g.enemies.find(e=>e.kind==='boss');
  g.hero.x=boss.x+150;g.hero.y=boss.y;g.provokeMonster(boss);
  boss.attackAt=0;
  const startHealth=g.resources.health;
  g.update(.05);
  assert.equal(g.bossZones.length,1,'boss must telegraph before dealing damage');
  assert.equal(g.resources.health,startHealth,'damage must not occur before windup');
  g.hero.x+=250; // sidestep warning circle
  for(let i=0;i<20;i++)g.update(.05);
  assert.equal(g.bossZones.length,0);
  assert.equal(g.resources.health,startHealth,'dodging boss warning circle must work');
});

test('desert raider fires projectiles, not only basic melee attacks', () => {
  const {g}=boot(),m=g.enemies.find(e=>e.kind==='raider');
  g.hero.x=m.x+155;g.hero.y=m.y;
  g.provokeMonster(m);
  m.attackAt=0;
  g.update(.05);
  assert.ok(g.enemyShots.length>0,'raider should shoot at a medium-distance target');
  assert.equal(g.enemyShots[0].kind,'raider');
});

test('defeating the boss grants bonus XP and a shower of gold', () => {
  const {g}=boot(),boss=g.enemies.find(e=>e.kind==='boss');
  g.hurtMonster(boss,560);
  assert.equal(boss.hp,0);
  assert.equal(g.progress.xp,5); // 200 XP rolls over through several levels.
  assert.ok(g.progress.level>=3);
  assert.ok(g.loot.filter(i=>i.kind==='gold').length>=18);
  assert.ok(g.loot.some(i=>i.kind==='potion'));
  assert.ok(boss.respawnAt>20);
});

test('uploaded forest goblin sheet is loaded from the committed custom assets path', () => {
  const {g}=boot();
  assert.equal(g.forestGoblinSheet.url,'assets/custom/forest_goblin.png');
  const goblin=g.enemies.find(e=>e.kind==='goblin');
  assert.ok(goblin);
  assert.equal(g.drawForestGoblinSprite(goblin),false,'missing image uses a safe fallback');
  assert.doesNotThrow(()=>g.drawAdventureEnemy(goblin));
});

test('forest goblin uses 8 transparent frames with ground-aligned sprite dimensions', () => {
  const {g,drawCalls}=boot();
  const goblin=g.enemies.find(e=>e.kind==='goblin');
  const image=g.forestGoblinSheet;
  image.complete=true;image.naturalWidth=2048;image.naturalHeight=682;
  assert.equal(g.drawForestGoblinSprite(goblin),true);
  let call=drawCalls.find(c=>c[0]===image);
  assert.ok(call,'must draw actual uploaded sprite instead of a red-warrior placeholder');
  assert.equal(call[3],256);
  assert.equal(call[4],682);
  assert.ok(call[2]>=0&&call[2]<2048,'source frame must stay inside the sheet');
  assert.ok(call[8]>160&&call[8]<200,'character should scale to the game world');
  drawCalls.length=0;
  goblin.attackAnimStart=0;goblin.attackAnimUntil=.55;
  g.update(.2);
  assert.equal(g.drawForestGoblinSprite(goblin),true);
  call=drawCalls.find(c=>c[0]===image);
  assert.ok(call);
  assert.ok(call[1]>=256 && call[1]<=6*256,
    'active melee attack must use spear slash and thrust frames');
});
