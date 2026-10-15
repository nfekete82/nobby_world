import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import xml from 'xml-js'
import { compileWorlds } from './world-data.mjs'
import { validateMapExpansion } from '../src/ui/map-resize.mjs'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
export const EDITOR_BODY_LIMIT=1_500_000
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,70}$/.test(id)
const allowedOrigins=new Set(['http://127.0.0.1:5173','http://localhost:5173'])
const response=(res,status,body)=>{
 res.statusCode=status
 res.setHeader('Content-Type','application/json; charset=utf-8')
 res.setHeader('Cache-Control','no-store')
 res.end(JSON.stringify(body))
}
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
 if(newMap.layers!==oldMap.layers)throw Error('Kachelebenen dürfen beim Speichern nicht entfernt werden')
 return newMap
}
/** A managed editor save is recompiled only when the user closes the editor;
 * the watcher must not interrupt the save acknowledgment with a full reload. */
const pendingSaves=new Map()
export function ignoreEditorFileChange(filename){
 const until=pendingSaves.get(path.resolve(filename))
 if(!until)return false
 if(Date.now()>until){pendingSaves.delete(path.resolve(filename));return false}
 return true
}
const rememberSave=filename=>pendingSaves.set(path.resolve(filename),Date.now()+20000)
export function editorWrite({id,original,updated},rootDir=root,{compile=()=>compileWorlds({writeOutput:false})}={}) {
 if(!validId(id)||typeof original!=='string'||typeof updated!=='string'||
    updated.length>EDITOR_BODY_LIMIT||original.length>EDITOR_BODY_LIMIT)
  return {status:400,body:{error:'Ungültige oder zu große Karte'}}
 const filename=path.resolve(rootDir,'src/tiled',id+'.tmx')
 if(!filename.startsWith(path.resolve(rootDir,'src/tiled')+path.sep)||
    !fs.existsSync(filename)||!fs.statSync(filename).isFile())
  return {status:404,body:{error:'Karte existiert nicht'}}
 const current=fs.readFileSync(filename,'utf8')
 if(current!==original)return {status:409,body:{error:'Karte wurde inzwischen geändert: bitte Editor neu öffnen (nichts überschrieben).'}}
 let dimensions
 try{dimensions=validateEditorMap(original,updated)}
 catch(error){return {status:400,body:{error: error instanceof Error?error.message:String(error)}}}
 if(current===updated)return {status:200,body:{ok:true,unchanged:true,...dimensions}}
 const temp=filename+'.nobby-editor-tmp'
 try{
  const backup=path.join(rootDir,'art','map-backups')
  fs.mkdirSync(backup,{recursive:true})
  const stamp=new Date().toISOString().replace(/[:.]/g,'-')
  fs.writeFileSync(path.join(backup,'web-editor-'+id+'-'+stamp+'.tmx'),current)
  rememberSave(filename)
  fs.writeFileSync(temp,updated,'utf8')
  fs.renameSync(temp,filename)
  const readback=fs.readFileSync(filename,'utf8')
  if(readback!==updated)throw Error('Gespeicherter TMX-Inhalt weicht ab')
  const actual=validateEditorMap(original,readback)
  compile()
  return {status:200,body:{ok:true,needsRefresh:true,...actual}}
 }catch(error){
  fs.writeFileSync(filename,current,'utf8')
  return {status:422,body:{error:'Speichern abgebrochen und Original wiederhergestellt: '+(error instanceof Error?error.message:String(error))}}
 }finally{
  if(fs.existsSync(temp))fs.unlinkSync(temp)
 }
}
export function editorApi(req,res,next){
 if(!req.url?.startsWith('/__nobby-editor/'))return next()
 const origin=req.headers.origin
 const host=String(req.headers.host||'')
 if(!/^(localhost|127\.0\.0\.1):5173$/.test(host)||
    !allowedOrigins.has(origin)||req.headers['x-nobby-editor']!=='local-authoring'){
  response(res,403,{error:'Kartenänderungen nur lokal in der Vorschau auf Port 5173 erlaubt'})
  return
 }
 if(req.method!=='POST'){response(res,405,{error:'Nur POST erlaubt'});return}
 if(req.url==='/__nobby-editor/refresh'){
  try{
   compileWorlds()
   response(res,200,{ok:true})
  }catch(error){
   response(res,422,{error:'Karte ist gespeichert, aber Spiel-Neuladen fehlgeschlagen: '+String(error)})
  }
  return
 }
 if(req.url!=='/__nobby-editor/save'){
  response(res,404,{error:'Editor-Endpunkt nicht gefunden'})
  return
 }
 let length=0;const chunks=[]
 req.on('data',chunk=>{
  length+=chunk.length
  if(length>EDITOR_BODY_LIMIT*2+1024){response(res,413,{error:'Karte zu groß'});req.destroy();return}
  chunks.push(chunk)
 })
 req.on('end',()=>{
  if(res.writableEnded)return
  try{
   const json=JSON.parse(Buffer.concat(chunks).toString('utf8'))
   const result=editorWrite(json)
   response(res,result.status,result.body)
  }catch{response(res,400,{error:'Ungültige Editordaten'})}
 })
 req.on('error',()=>{if(!res.writableEnded)response(res,400,{error:'Verbindung unterbrochen'})})
}
