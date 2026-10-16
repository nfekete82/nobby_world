import fs from 'node:fs'
import {randomUUID} from 'node:crypto'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawn} from 'node:child_process'
import xml from 'xml-js'
import {validateMapExpansion} from '../src/ui/map-resize.mjs'
import {EditorError,hash,validId,safePath,atomicWrite,commitFiles,previousOperation,serial,audit,recoverTransactions} from './editor-storage.mjs'
import {assetCatalog,assetUsage,readAsset,importImages,saveAsset,deleteAsset,restoreAsset} from './editor-assets.mjs'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
export const EDITOR_BODY_LIMIT=1_500_000
export const EDITOR_UPLOAD_LIMIT=24*1024*1024
const array=x=>x==null?[]:Array.isArray(x)?x:[x]
/** Validate a complete finite TMX document before touching the actual map.
 * Do not rename/remove Tiled layers: native Tiled and navigation depend on them. */
export function validateEditorMap(original,updated){
 if(typeof original!=='string'||typeof updated!=='string'
    ||/<!DOCTYPE|<!ENTITY/i.test(updated))throw Error('Unsicheres TMX-Dokument')
 const parse=(value)=>{
  if(!/^<\?xml[^>]*\?>\s*<map\b/.test(value)||!/<\/map>\s*$/.test(value))
   throw Error('Ungültige TMX-Kartenstruktur')
  const node=xml.xml2js(value,{compact:true}).map
  if(!node?._attributes)throw Error('TMX-Kartenkopf fehlt')
  const a=node._attributes
  const w=Number(a.width),h=Number(a.height)
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>128||h>128||w*h>6250)
   throw Error('Kartengröße außerhalb der Grenzen (maximal 6.250 Kacheln)')
  const layers=array(node.layer)
  if(!layers.length)throw Error('Die Karte benötigt mindestens eine Kachelebene')
  for(const l of layers){
   const name=l._attributes?.name||'unbenannt'
   if(Number(l._attributes?.width)!==w||Number(l._attributes?.height)!==h)
    throw Error('Ebene '+name+': Breite/Höhe stimmen nicht mit der Karte überein')
   if(l.data?._attributes?.encoding!=='csv')
    throw Error('Ebene '+name+': CSV-Daten erforderlich')
   const cells=String(l.data._text??'').trim().split(/\s*,\s*/)
   if(cells.length!==w*h||cells.some(c=>!/^\d+$/.test(c)||Number(c)>4294967295))
    throw Error('Ebene '+name+': Kacheldaten unvollständig oder ungültig')
  }
  return {width:w,height:h,layers:layers.length}
 }
 let oldMap,newMap
 try{oldMap=parse(original);newMap=parse(updated)}
 catch(error){throw Error('Karte ungültig: '+(error instanceof Error?error.message:String(error)))}
 if(newMap.width!==oldMap.width||newMap.height!==oldMap.height){
  const error=validateMapExpansion(oldMap.width,oldMap.height,newMap.width,newMap.height)
  if(error)throw Error(error)
 }
 const before=array(xml.xml2js(original,{compact:true}).map.layer),after=array(xml.xml2js(updated,{compact:true}).map.layer)
 for(const layer of before)if(!after.some(l=>l._attributes?.name===layer._attributes?.name&&l._attributes?.id===layer._attributes?.id))throw Error('Bestehende Kachelebenen und IDs müssen erhalten bleiben')
 return newMap
}
const managed=new Map(),leases=new Map()
export function editorIsActive(){for(const [id,at] of leases){if(Date.now()-at>15000)leases.delete(id)}return leases.size>0}
export function ignoreEditorFileChange(filename){return editorIsActive()||(managed.get(path.resolve(filename))||0)>Date.now()}
export function validationJob(rootDir,job,{signal,timeout=15000}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted)return reject(new EditorError('Vorgang abgebrochen; Entwurf bleibt erhalten.',499))
  const child=spawn(process.execPath,[path.join(rootDir,'scripts/editor-validate-worker.mjs')],{cwd:rootDir,stdio:['pipe','pipe','pipe']})
  let stderr='',done=false
  const finish=(error)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve()}
  const abort=()=>{child.kill('SIGKILL');finish(new EditorError('Vorgang abgebrochen; Entwurf bleibt erhalten.',499))}
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new EditorError('Prüfung dauerte zu lange. Nichts wurde überschrieben; bitte erneut versuchen.',504))},timeout)
  signal?.addEventListener('abort',abort,{once:true})
  child.stderr.on('data',data=>{if(stderr.length<10000)stderr+=data});child.stdout.resume()
  child.on('error',finish);child.on('close',code=>finish(code===0?null:new EditorError('Kartenprüfung fehlgeschlagen: '+stderr,422)))
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(job))
 })
}
export async function editorWrite(payload,rootDir=root,{compile,signal}={}){
 return serial(rootDir,async()=>{
  const {id,original,updated}=payload||{},operationId=payload?.operationId||randomUUID()
  try{
   if(!validId(id)||!validId(operationId)||typeof original!=='string'||typeof updated!=='string'||Buffer.byteLength(original)>EDITOR_BODY_LIMIT||Buffer.byteLength(updated)>EDITOR_BODY_LIMIT)throw new EditorError('Ungültige oder zu große Karte')
   const relative='src/tiled/'+id+'.tmx',file=safePath(rootDir,relative)
   if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw new EditorError('Karte existiert nicht',404)
   const fingerprint=hash(JSON.stringify({id,original,updated})),replay=previousOperation(rootDir,operationId,fingerprint)
   if(replay){if(hash(fs.readFileSync(file))!==replay.revision)throw new EditorError('Der gespeicherte Stand wurde inzwischen extern geändert. Dein Entwurf bleibt erhalten.',409);return {status:200,body:replay}}
   const current=fs.readFileSync(file,'utf8')
   if(current!==original)throw new EditorError('Externer Bearbeitungskonflikt: Tiled oder ein anderer Editor hat diese Karte geändert. Entwurf exportieren oder Karte neu öffnen.',409)
   let dimensions;try{dimensions=validateEditorMap(original,updated)}catch(error){throw new EditorError(error.message)}
   if(current===updated)return {status:200,body:{ok:true,unchanged:true,revision:hash(updated),...dimensions}}
   audit(rootDir,{id:operationId,status:'validating',map:id,bytes:Buffer.byteLength(updated)})
   await (compile?compile({id,original,updated}):validationJob(rootDir,{id,updated},{signal}))
   if(signal?.aborted)throw new EditorError('Speichern abgebrochen; Entwurf bleibt erhalten.',499)
   // Validation happens before publication. Compile/refresh errors after this
   // durable commit must NEVER restore an older map over a user's later edits.
   const backup=safePath(rootDir,'art/map-backups/web-editor-'+id+'-'+operationId+'.tmx')
   atomicWrite(backup,current)
   managed.set(file,Date.now()+20000)
   const body=commitFiles(rootDir,{id:operationId,fingerprint,writes:[{path:relative,data:updated,expected:hash(current)}],
    result:{ok:true,needsRefresh:true,operationId,revision:hash(updated),...dimensions}})
   validateEditorMap(original,fs.readFileSync(file,'utf8'))
   return {status:200,body}
  }catch(error){audit(rootDir,{id:operationId,status:'failed',error:String(error)});return {status:error.status||422,body:{error:error.message||String(error),operationId}}}
 })
}
const reply=(res,status,body)=>{if(res.writableEnded||res.destroyed)return;res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body))}
export function createEditorApi({rootDir=root,compile,refresh,bodyTimeout=15000,readOnly=process.env.NOBBY_EDITOR_READ_ONLY==='1'}={}){
 const tokens=new Set();recoverTransactions(rootDir)
 return async function editorApi(req,res,next){
  if(!req.url?.startsWith('/__nobby-editor/'))return next()
  const host=String(req.headers.host||''),origin=req.headers.origin
  if(!/^(localhost|127\.0\.0\.1):5173$/.test(host)||!['http://localhost:5173','http://127.0.0.1:5173'].includes(origin)||req.headers['x-nobby-editor']!=='local-authoring')return reply(res,403,{error:'Bearbeitung nur im autorisierten lokalen Editor auf localhost:5173 erlaubt.'})
  if(req.method!=='POST')return reply(res,405,{error:'Nur POST erlaubt'})
  const route=req.url.slice('/__nobby-editor/'.length)
  if(route==='session'){const token=randomUUID();tokens.add(token);return reply(res,200,{token,writable:!readOnly,capabilities:['assets','animations','backups','trash']})}
  const token=String(req.headers['x-nobby-editor-token']||'')
  if(!tokens.has(token))return reply(res,403,{error:'Editor-Sitzung abgelaufen. Entwurf bleibt erhalten; Sitzung erneut verbinden.'})
  if(readOnly&&!['catalog','assets/read','usage','heartbeat','close'].includes(route))return reply(res,403,{error:'Diese Umgebung ist schreibgeschützt. Bearbeiten nur in der lokalen Mac-Vorschau.'})
  const controller=new AbortController();let length=0,chunks=[],ended=false
  const timer=setTimeout(()=>{controller.abort();reply(res,408,{error:'Upload-Zeit überschritten; bitte erneut versuchen.'});req.resume()},bodyTimeout)
  req.on('aborted',()=>{clearTimeout(timer);chunks=[];controller.abort()})
  req.on('error',()=>{clearTimeout(timer);chunks=[];controller.abort();reply(res,400,{error:'Übertragung unterbrochen; Entwurf bleibt erhalten.'})})
  res.on('close',()=>{if(!res.writableEnded)controller.abort()})
  req.on('data',chunk=>{length+=chunk.length;if(length>EDITOR_UPLOAD_LIMIT){ended=true;chunks=[];clearTimeout(timer);controller.abort();reply(res,413,{error:'Upload zu groß (maximal 24 MB pro Anfrage).'});return}if(!ended)chunks.push(chunk)})
  req.on('end',async()=>{
   clearTimeout(timer);if(ended||controller.signal.aborted)return
   try{
    const data=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');chunks=[]
    let result
    if(route==='heartbeat'){leases.set(token,Date.now());result={ok:true}}
    else if(route==='close'){leases.delete(token);tokens.delete(token);result={ok:true}}
    else if(route==='catalog')result=assetCatalog(rootDir)
    else if(route==='assets/read')result=await readAsset(rootDir,data.id)
    else if(route==='usage')result={usage:assetUsage(rootDir,data.id)}
    else if(route==='assets/import')result=await importImages(data)
    else if(route==='assets/save')result=await serial(rootDir,()=>saveAsset(rootDir,data,{signal:controller.signal}))
    else if(route==='assets/delete')result=await serial(rootDir,()=>deleteAsset(rootDir,data))
    else if(route==='assets/restore')result=await serial(rootDir,()=>restoreAsset(rootDir,data))
    else if(route==='save'){const saved=await editorWrite(data,rootDir,{compile,signal:controller.signal});return reply(res,saved.status,saved.body)}
    else if(route==='refresh'){
     await serial(rootDir,()=>refresh?refresh():validationJob(rootDir,{mode:'refresh'},{signal:controller.signal,timeout:20000}));result={ok:true}
    }else throw new EditorError('Editor-Endpunkt nicht gefunden',404)
    reply(res,200,result)
   }catch(error){reply(res,error.status||422,{error:error.message||String(error),saved:route==='refresh'})}
  })
 }
}
let defaultApi
export function editorApi(req,res,next){defaultApi??=createEditorApi();return defaultApi(req,res,next)}
