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
  bootAnchor + '\nwindow.__test={enemies,fireballs,resources,progress,loot,hero,merchant,equipment,camera,update,hurtMonster,grantXP,damageHero,drawCombatEffects,drawMerchant,openShop,closeShop,buyItem,saveGame,route:()=>route,target:()=>target,shopState:()=>shopOpen};'
);

function boot(initialSave = null) {
  const stored = new Map();
  if(initialSave)stored.set('nobby_world_save_v1', JSON.stringify(initialSave));
  const callbacks = new Map();
  const gradient = () => ({ addColorStop() {} });
  const ctx = new Proxy({
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
    addEventListener() {}, getContext() { return ctx; }
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
    g, stored,
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
  assert.equal(g.enemies.length,9);
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
  g.equipment.focus=true;g.equipment.charm=true;
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
