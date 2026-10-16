import fs from 'node:fs'
import path from 'node:path'
import {atomicWrite,readJSON,safePath,withStorageLock} from './editor-storage.mjs'
export const emptyManifest=()=>({version:1,revision:0,assets:{},trash:{}})
export const userManifest=root=>readJSON(root,'art/user-assets/manifest.json',emptyManifest())
export function applyUserAssets(registry,manifest){
 const result=structuredClone(registry)
 for(const [id,entry] of Object.entries(manifest.assets))result.assets[id]={...entry.asset,editorManaged:true}
 return result
}
export function ensureUserAssetRegistry(root,{baseRegistry}={}){
 return withStorageLock(root,()=>{
 const baseFile=safePath(root,'art/registry-base.json'),runtime=safePath(root,'src/art/registry.json')
 if(baseRegistry)atomicWrite(baseFile,JSON.stringify(baseRegistry,null,2)+'\n')
 const base=baseRegistry||JSON.parse(fs.readFileSync(fs.existsSync(baseFile)?baseFile:runtime,'utf8'))
 const result=applyUserAssets(base,userManifest(root)),bytes=JSON.stringify(result,null,2)+'\n'
 if(!fs.existsSync(runtime)||fs.readFileSync(runtime,'utf8')!==bytes)atomicWrite(runtime,bytes)
 return result
 },{waitMs:2000})
}
