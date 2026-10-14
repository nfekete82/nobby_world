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
  bootAnchor + '\nwindow.__test={enemies,fireballs,resources,hero,camera,update,hurtMonster,damageHero,route:()=>route,target:()=>target};'
);

function boot() {
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
    classList: { add() {} }, style: {}, setAttribute() {}, remove() {},
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
  vm.runInNewContext(instrumented, {
    console, document, window, Image, innerWidth: 1280, innerHeight: 800,
    devicePixelRatio: 1, performance: { now: () => 0 },
    setTimeout() {}, requestAnimationFrame() {}
  }, { timeout: 10000 });
  const g = window.__test;
  assert.ok(g, 'game test hook missing');
  return {
    g,
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
