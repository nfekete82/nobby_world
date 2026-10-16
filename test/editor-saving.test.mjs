import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {fixture,simpleMap} from './helpers/editor-fixture.mjs'
import {editorWrite,createEditorApi,validationJob,EDITOR_UPLOAD_LIMIT} from '../scripts/web-editor-api.mjs'
import {SaveSnapshot,EditorClient} from '../src/ui/editor-client.mjs'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
test('save double-click, later edits, timeout, cancellation and idempotent retry preserve exact snapshot',async()=>{
 const s=new SaveSnapshot(),first=s.begin('map','original','first');assert.equal(s.begin('map','original','duplicate'),null)
 s.finish();assert.equal(s.begin('map','original','later'),first);assert.deepEqual(s.acknowledge('later'),{source:'first',dirty:true});s.finish()
 const oldFetch=globalThis.fetch;try{
  globalThis.fetch=(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('abort')),{once:true}))
  const c=new EditorClient();c.token='test';await assert.rejects(c.request('save',{}, {timeout:20}),e=>e.uncertain&&/Zeitüberschreitung/.test(e.message))
  const controller=new AbortController();const promise=c.request('save',{}, {signal:controller.signal});controller.abort();await assert.rejects(promise,/abgebrochen/)
 }finally{globalThis.fetch=oldFetch}
})
test('parallel map saves, uncertain retry, compiler failure and external Tiled write during validation',async()=>{
 const f=fixture();try{
  const a={id:'simplemap',original:simpleMap(),updated:simpleMap(1),operationId:'save-a'},b={...a,updated:simpleMap(2),operationId:'save-b'};let calls=0
  const compile=async()=>{calls++;await wait(15)}
  const results=await Promise.all([editorWrite(a,f.root,{compile}),editorWrite(b,f.root,{compile})]);assert.deepEqual(results.map(r=>r.status),[200,409]);assert.equal(calls,1)
  assert.equal((await editorWrite(a,f.root,{compile})).body.revision,results[0].body.revision);assert.equal(calls,1)
  const bad=await editorWrite({...b,original:simpleMap(1)},f.root,{compile(){throw Error('compiler exploded')}});assert.equal(bad.status,422);assert.equal(f.read('src/tiled/simplemap.tmx'),simpleMap(1))
  const conflict=await editorWrite({...b,original:simpleMap(1)},f.root,{compile(){f.write('src/tiled/simplemap.tmx',simpleMap(3))}});assert.equal(conflict.status,409);assert.equal(f.read('src/tiled/simplemap.tmx'),simpleMap(3))
  const controller=new AbortController();const abort=await editorWrite({...b,original:simpleMap(3)},f.root,{signal:controller.signal,compile(){controller.abort()}});assert.equal(abort.status,499);assert.equal(f.read('src/tiled/simplemap.tmx'),simpleMap(3))
  assert.ok(f.read('art/editor-history/events.jsonl').includes('committed'))
  const worker='scripts/editor-validate-worker.mjs';f.write(worker,'setTimeout(()=>{},10000)');await assert.rejects(validationJob(f.root,{}, {timeout:20}),e=>e.status===504)
  const retry=await editorWrite({...b,original:simpleMap(3)},f.root,{compile(){}});assert.equal(retry.status,200);assert.equal(f.read('src/tiled/simplemap.tmx'),simpleMap(2))
 }finally{f.cleanup()}
})
test('HTTP authority/session/read-only protection, malformed/aborted/oversized requests, failed refresh cannot roll back save',async()=>{
 const f=fixture(),api=createEditorApi({rootDir:f.root,bodyTimeout:100,compile(){},refresh(){throw Error('refresh failed')}}),server=http.createServer((req,res)=>api(req,res,()=>{res.statusCode=404;res.end()}));await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port
 const request=(route,body={},headers={})=>new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path:'/__nobby-editor/'+route,method:'POST',headers:{host:'127.0.0.1:5173',origin:'http://127.0.0.1:5173','x-nobby-editor':'local-authoring',...headers}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(text)}))});req.on('error',reject);req.end(typeof body==='string'?body:JSON.stringify(body))})
 try{
  assert.equal((await request('session',{}, {origin:'https://evil.invalid'})).status,403);assert.equal((await request('save')).status,403)
  const token=(await request('session')).body.token,h={'x-nobby-editor-token':token}
  assert.equal((await request('save','{',h)).status,422)
  assert.equal((await request('save',{id:'simplemap',original:simpleMap(),updated:simpleMap(1)},h)).status,200)
  const refresh=await request('refresh',{},h);assert.equal(refresh.status,422);assert.equal(refresh.body.saved,true);assert.equal(f.read('src/tiled/simplemap.tmx'),simpleMap(1))
  assert.equal((await request('assets/import',' '.repeat(EDITOR_UPLOAD_LIMIT+1),h)).status,413)
  const stalled=await new Promise(resolve=>{const req=http.request({hostname:'127.0.0.1',port,path:'/__nobby-editor/save',method:'POST',headers:{host:'127.0.0.1:5173',origin:'http://127.0.0.1:5173','x-nobby-editor':'local-authoring',...h,'content-length':'10000'}},res=>{res.resume();res.on('end',()=>{resolve(res.statusCode);req.destroy()})});req.on('error',()=>{});req.write('{"id":')});assert.equal(stalled,408)
  assert.equal(f.read('src/tiled/simplemap.tmx'),simpleMap(1))
  await new Promise(resolve=>{const req=http.request({hostname:'127.0.0.1',port,path:'/__nobby-editor/save',method:'POST',headers:{host:'127.0.0.1:5173',origin:'http://127.0.0.1:5173','x-nobby-editor':'local-authoring',...h,'content-length':'10000'}});req.on('error',resolve);req.write('{"id":');setTimeout(()=>{req.destroy();resolve()},10)});await wait(20);assert.equal(f.read('src/tiled/simplemap.tmx'),simpleMap(1))
  const readOnly=createEditorApi({rootDir:f.root,readOnly:true}),ro=http.createServer((req,res)=>readOnly(req,res,()=>res.end()));await new Promise(r=>ro.listen(0,'127.0.0.1',r));try{
   const result=await new Promise(resolve=>{const req=http.request({hostname:'127.0.0.1',port:ro.address().port,path:'/__nobby-editor/session',method:'POST',headers:{host:'127.0.0.1:5173',origin:'http://127.0.0.1:5173','x-nobby-editor':'local-authoring'}},res=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>resolve(JSON.parse(b)))});req.end()});assert.equal(result.writable,false)
  }finally{await new Promise(r=>ro.close(r))}
 }finally{await new Promise(r=>server.close(r));f.cleanup()}
})
test('large real authored TMX saves only in a temporary fixture',async()=>{
 const original=fs.readFileSync(process.env.NOBBY_EDITOR_LARGE_MAP||'src/tiled/simplemap.tmx','utf8'),f=fixture();try{
  f.write('src/tiled/simplemap.tmx',original);const updated=original.replace('</map>','<!-- isolated roundtrip -->\n</map>');const saved=await editorWrite({id:'simplemap',original,updated},f.root,{compile(){}});assert.equal(saved.status,200);assert.equal(f.read('src/tiled/simplemap.tmx'),updated);assert.equal(fs.readFileSync(process.env.NOBBY_EDITOR_LARGE_MAP||'src/tiled/simplemap.tmx','utf8'),original)
 }finally{f.cleanup()}
})
