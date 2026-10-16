import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {fixture} from './helpers/editor-fixture.mjs'
import {ensureUserAssetRegistry} from '../scripts/user-assets.mjs'
import {commitFiles,withStorageLock} from '../scripts/editor-storage.mjs'

const lockFile=root=>path.join(root,'art/editor-history/write.lock')
const createLock=(root,pid=process.pid)=>{
 const file=lockFile(root)
 fs.mkdirSync(path.dirname(file),{recursive:true})
 fs.writeFileSync(file,JSON.stringify({pid,created:Date.now()}),{flag:'wx'})
 return file
}

test('interactive editor writes still fail immediately on an occupied lock',()=>{
 const f=fixture()
 try{
  const file=createLock(f.root)
  try{
   assert.throws(()=>commitFiles(f.root,{fingerprint:'content',writes:[],result:{ok:true}}),
     error=>error.status===423)
   assert.throws(()=>withStorageLock(f.root,()=>true,{waitMs:30}),
     error=>error.status===423)
  }finally{fs.unlinkSync(file)}
 }finally{f.cleanup()}
})

test('registry initialization waits briefly for a different live Node process', {timeout:5000},async()=>{
 const f=fixture(),file=lockFile(f.root)
 fs.mkdirSync(path.dirname(file),{recursive:true})
 const child=spawn(process.execPath,['-e',
  "const fs=require('node:fs');const file=process.argv[1];fs.writeFileSync(file,JSON.stringify({pid:process.pid,created:Date.now()}),{flag:'wx'});process.stdout.write('READY\\n');setTimeout(()=>{fs.unlinkSync(file)},250)",
  file],{stdio:['ignore','pipe','pipe']})
 let completed=false
 try{
  await Promise.race([
   once(child.stdout,'data'),
   once(child,'exit').then(([code])=>{throw Error('Lock holder exited before signal: '+code)})
  ])
  assert.ok(fs.existsSync(file),'child did not acquire lock')
  const art=ensureUserAssetRegistry(f.root)
  assert.equal(art.assets.test.kind,'prop')
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.root,'src/art/registry.json'),'utf8')).assets.test.kind,'prop')
  completed=true
 }finally{
  if(child.exitCode===null){
   if(!completed)child.kill()
   await once(child,'exit')
  }
  f.cleanup()
 }
})
