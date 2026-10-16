import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import sharp from 'sharp'
import {PNG} from 'pngjs'
import {fixture,pixel,disposalGif} from './helpers/editor-fixture.mjs'
import {decodeImage,importImages,readAsset,saveAsset,deleteAsset,restoreAsset,assetCatalog,assetUsage} from '../scripts/editor-assets.mjs'
import {safePath,hash,serial,commitFiles,recoverTransactions} from '../scripts/editor-storage.mjs'
import {ensureUserAssetRegistry} from '../scripts/user-assets.mjs'
import {animationFrameIndices} from '../src/art/animation-policy.mjs'
const save=(f,id,draft,revision,extra={})=>saveAsset(f.root,{id,draft,baseRevision:revision,...extra})
test('PNG/JPEG/WebP content decoding, sheet slicing and independent GIF disposal/transparency/timing',async()=>{
 const png=pixel();for(const format of ['png','jpeg','webp']){
  const b=await sharp(Buffer.from(png,'base64'))[format]().toBuffer();const decoded=await decodeImage(b.toString('base64'));assert.equal(decoded.format,format);assert.equal(decoded.width,4)
 }
 const gif=await importImages({files:[{name:'animation.gif',data:disposalGif()}]});assert.deepEqual(gif.frameDurations,[30,70,120,200]);assert.equal(gif.cells[0].length,4)
 const rgba=gif.cells[0].map(s=>[...PNG.sync.read(Buffer.from(s,'base64')).data]);assert.deepEqual(rgba[0],[255,0,0,255,255,0,0,255,0,0,0,0]);assert.deepEqual(rgba[1].slice(4,8),[0,255,0,255]);assert.deepEqual(rgba[2].slice(4,8),[0,0,0,0]);assert.deepEqual(rgba[3],[255,0,0,255,0,0,0,0,0,255,0,255])
 const sheet=await importImages({files:[{name:'sheet.png',data:pixel([7,9,11,255],8,8)}],layout:{width:4,height:4,rows:2}});assert.equal(sheet.cells.length,2);assert.equal(sheet.cells[0].length,2)
 await assert.rejects(importImages({files:[{name:'a.png',data:png},{name:'b.png',data:pixel(undefined,3,3)}]}),/unterschiedliche/)
})
test('frame/animation editing, duplication, durable registry, delete/reference block/restore, immutable originals',async()=>{
 const f=fixture();try{
  const original=f.read('public/tiny-swords/test.png');let {draft}=await readAsset(f.root,'test')
  draft.asset.animations.stand.cells[0][0]=pixel([0,255,0,255]);draft.asset.animations.stand.userEdited=true
  draft.asset.animations.extra=structuredClone(draft.asset.animations.stand)
  const first=await save(f,'test',draft,0,{operationId:'save-first'});assert.equal(first.revision,1)
  assert.deepEqual(await save(f,'test',draft,0,{operationId:'save-first'}),first)
  assert.equal(f.read('public/tiny-swords/test.png'),original)
  let runtime=f.json('src/art/registry.json');assert.match(runtime.assets.test.animations.stand.image,/tiny-swords\/user\/test\//)
  assert.deepEqual([...PNG.sync.read(fs.readFileSync(path.join(f.root,'public',runtime.assets.test.animations.stand.image))).data.slice(0,4)],[0,255,0,255])
  // Simulate normal build compiler re-registering its originals: user overlay wins.
  ensureUserAssetRegistry(f.root,{baseRegistry:f.json('art/registry-base.json')});assert.deepEqual(f.json('src/art/registry.json'),runtime)
  ;({draft}=await readAsset(f.root,'test'));delete draft.asset.animations.extra;draft.asset.editorBaseId='test'
  await save(f,'copy',draft,1);assert.equal(f.json('src/art/registry.json').assets.copy.animations.extra,undefined)
  f.write('editor/templates/used.tx','<template><object id="8"><properties><property name="asset" value="copy"/></properties></object></template>')
  assert.equal(assetUsage(f.root,'copy')[0].objectId,'8');assert.throws(()=>deleteAsset(f.root,{id:'copy',baseRevision:2}),/verwendet/)
  fs.unlinkSync(path.join(f.root,'editor/templates/used.tx'));const del=deleteAsset(f.root,{id:'copy',baseRevision:2,operationId:'delete-copy'});assert.equal(deleteAsset(f.root,{id:'copy',baseRevision:2,operationId:'delete-copy'}).trashId,del.trashId)
  assert.equal(f.json('src/art/registry.json').assets.copy,undefined)
  const restored=restoreAsset(f.root,{key:del.trashId,baseRevision:3,operationId:'restore-copy'});assert.equal(restored.id,'copy');assert.equal(restoreAsset(f.root,{key:del.trashId,baseRevision:3,operationId:'restore-copy'}).id,'copy')
  assert.ok(f.json('src/art/registry.json').assets.copy)
  assert.throws(()=>deleteAsset(f.root,{id:'test',baseRevision:4}),/geschützt/)
  const reset=deleteAsset(f.root,{id:'test',baseRevision:4,reset:true});assert.equal(f.json('src/art/registry.json').assets.test.animations.stand.image,'tiny-swords/test.png');assert.ok(reset.trashId)
  draft.asset.animations.stand.cells[0].push(pixel());draft.asset.animations.stand.frameDurations.push(90)
  await assert.rejects(save(f,'copy',draft,4),/Bibliothek/)
 }finally{f.cleanup()}
})
test('new assets, whole sheet replacement, required animations, size mismatch, concurrent CAS and repair missing files',async()=>{
 const f=fixture();try{
  const {draft}=await readAsset(f.root,'test');draft.asset.kind='actor';draft.asset.animations.walk=structuredClone(draft.asset.animations.stand)
  const sheet=await importImages({files:[{name:'sheet.png',data:pixel([5,6,7,255],12,4)}],layout:{width:4,height:4}})
  Object.assign(draft.asset.animations.walk,sheet,{fps:10,userEdited:true});await save(f,'new',draft,0)
  assert.equal(f.json('src/art/registry.json').assets.new.animations.walk.frames,3)
  delete draft.asset.animations.walk;await assert.rejects(save(f,'new',draft,1),/Pflichtanimation/)
  draft.asset.kind='prop';draft.asset.animations.stand.cells[0][0]=pixel(undefined,8,8);await assert.rejects(save(f,'invalid',draft,1),/Framegröße/)
  draft.asset.animations.stand.cells[0][0]=pixel()
  const results=await Promise.allSettled([serial(f.root,()=>save(f,'a',draft,1)),serial(f.root,()=>save(f,'b',draft,1))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409)
  fs.unlinkSync(path.join(f.root,'public/tiny-swords/test.png'));assert.ok(assetCatalog(f.root).assets.find(a=>a.id==='test').problems.length);assert.ok((await readAsset(f.root,'test')).draft.asset.animations.stand.cells[0][0])
  assert.deepEqual(animationFrameIndices('shaman','stand',1,true),[0])
 }finally{f.cleanup()}
})
test('malicious files, oversized images, traversal, symlinks and impossible terrain geometry rejected',async()=>{
 const f=fixture();try{
  for(const value of ['<svg onload="alert(1)"/>','MZ executable','GIF89a broken'])await assert.rejects(decodeImage(Buffer.from(value).toString('base64')))
  await assert.rejects(decodeImage('A'.repeat(17*1024*1024)),/groß/)
  const wide=await sharp({create:{width:2049,height:1,channels:4,background:'#fff'}}).png().toBuffer();await assert.rejects(decodeImage(wide.toString('base64')),/Grenzen/)
  await assert.rejects(importImages({files:[{name:'evil.svg',data:pixel()}]}),/Dateiendung/)
  for(const id of ['../escape','/tmp/escape','a/../../x','a\\..\\x'])assert.throws(()=>safePath(f.root,id))
  fs.symlinkSync('/tmp',path.join(f.root,'link'));assert.throws(()=>safePath(f.root,'link/escape'),/Links/)
  const {draft}=await readAsset(f.root,'test');await assert.rejects(save(f,'__proto__',draft,0),/Ungültige/)
  draft.asset.kind='terrain';draft.asset.terrainColumns=1e12;await assert.rejects(save(f,'terrain',draft,0),/Gelände/)
  assert.equal(f.json('art/user-assets/manifest.json').revision,0)
 }finally{f.cleanup()}
})
test('write-ahead recovery handles crashes and preserves external changes',()=>{
 const f=fixture();try{
  f.write('art/a','before');const record={id:'crash',phase:'prepared',entries:[{path:'art/a',before:Buffer.from('before').toString('base64'),after:Buffer.from('after').toString('base64')},{path:'art/b',before:null,after:Buffer.from('new').toString('base64')}]}
  f.write('art/a','after');f.write('art/editor-history/operations/crash.json',record);recoverTransactions(f.root);assert.equal(f.read('art/a'),'before');assert.equal(f.json('art/editor-history/operations/crash.json').phase,'rolled-back')
  record.phase='prepared';f.write('art/a','external');f.write('art/editor-history/operations/crash.json',record);recoverTransactions(f.root);assert.equal(f.read('art/a'),'external');assert.equal(f.json('art/editor-history/operations/crash.json').phase,'external-conflict')
  assert.throws(()=>commitFiles(f.root,{id:'abort',fingerprint:'f',writes:[{path:'art/a',data:'ours',expected:hash('external')}],beforeCommit(){f.write('art/a','Tiled')},result:{ok:true}}),/Externe/);assert.equal(f.read('art/a'),'Tiled')
  assert.equal(fs.existsSync(path.join(f.root,'art/editor-history/write.lock')),false)
 }finally{f.cleanup()}
})
test('terrain replacement protects tile IDs/collisions, supports native wide sheets, reset/restore and rejects stale TSX',async()=>{
 const f=fixture();try{
  f.write('src/tiled/native.tsx','<?xml version="1.0"?><tileset name="native" tilewidth="64" tileheight="64" tilecount="144" columns="48"><image source="tiny-swords/native.png" width="3072" height="192"/><tile id="0"><properties><property name="collision" type="bool" value="true"/></properties></tile></tileset>')
  const original=Buffer.from(pixel([7,11,13,255],3072,192),'base64');f.write('src/tiled/tiny-swords/native.png',original)
  const sheet=await importImages({files:[{name:'wide.png',data:original.toString('base64')}],layout:{width:64,height:64,rows:3}}).catch(e=>e)
  assert.match(sheet.message,/Sheet passt/,'three direction rows are not a supported animation layout')
  const wide=await importImages({files:[{name:'wide.png',data:pixel([7,11,13,255],3072,64)}],layout:{width:64,height:64,rows:1}});assert.equal(wide.cells[0].length,48)
  const grid=await importImages({files:[{name:'atlas.png',data:original.toString('base64')}],layout:{width:64,height:64,terrain:true,columns:48}});assert.equal(grid.cells[0].length,144)
  let {draft}=await readAsset(f.root,'terrain-native');assert.equal(draft.asset.animations.stand.cells[0].length,144)
  draft.asset.animations.stand.cells[0][0]=pixel([50,60,70,255],64,64);await save(f,'terrain-native',draft,0)
  assert.match(f.read('src/tiled/native.tsx'),/collision/);assert.match(f.read('src/tiled/native.tsx'),/tiny-swords\/user/);assert.ok(fs.readFileSync(path.join(f.root,'src/tiled/tiny-swords/native.png')).equals(original))
  const deleted=deleteAsset(f.root,{id:'terrain-native',baseRevision:1,reset:true});assert.match(f.read('src/tiled/native.tsx'),/source="tiny-swords\/native.png"/)
  restoreAsset(f.root,{key:deleted.trashId,baseRevision:2});assert.match(f.read('src/tiled/native.tsx'),/tiny-swords\/user/)
  ;({draft}=await readAsset(f.root,'terrain-native'));f.write('src/tiled/native.tsx',f.read('src/tiled/native.tsx')+'\n<!-- Tiled -->');await assert.rejects(save(f,'terrain-native',draft,3),/extern/)
 }finally{f.cleanup()}
})
test('retry never acknowledges an old asset snapshot over a later saved edit',async()=>{
 const f=fixture();try{
  const {draft}=await readAsset(f.root,'test');const original=structuredClone(draft);await save(f,'test',original,0,{operationId:'old-save'})
  draft.asset.animations.stand.cells[0][0]=pixel([0,255,0,255]);await save(f,'test',draft,1,{operationId:'later-save'})
  await assert.rejects(save(f,'test',original,0,{operationId:'old-save'}),e=>e.status===409)
  assert.equal(f.json('art/user-assets/manifest.json').assets.test.revision,2)
 }finally{f.cleanup()}
})
