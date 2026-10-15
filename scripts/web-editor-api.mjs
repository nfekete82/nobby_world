import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileWorlds } from './world-data.mjs'

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
export function editorWrite({id,original,updated},rootDir=root) {
 if(!validId(id)||typeof original!=='string'||typeof updated!=='string'||
    updated.length>EDITOR_BODY_LIMIT||original.length>EDITOR_BODY_LIMIT)
  return {status:400,body:{error:'Ungültige oder zu große Karte'}}
 const filename=path.resolve(rootDir,'src/tiled',id+'.tmx')
 if(!filename.startsWith(path.resolve(rootDir,'src/tiled')+path.sep)||
    !fs.existsSync(filename)||!fs.statSync(filename).isFile())
  return {status:404,body:{error:'Karte existiert nicht'}}
 const current=fs.readFileSync(filename,'utf8')
 if(current!==original)return {status:409,body:{error:'Die Karte wurde inzwischen in Tiled oder einer anderen Sitzung geändert. Bitte neu öffnen.'}}
 const srcHeader=current.match(/^<\?xml[^>]*\?>\s*<map\b[^>]*>/)
 const dstHeader=updated.match(/^<\?xml[^>]*\?>\s*<map\b[^>]*>/)
 if(!srcHeader||!dstHeader||!updated.includes('</map>')||/<!DOCTYPE|<!ENTITY/i.test(updated))
  return {status:400,body:{error:'Ungültiges TMX-Dokument'}}
 if(current===updated)return {status:200,body:{ok:true,unchanged:true}}
 // A failed parse must never damage the saved map.
 const temp=filename+'.nobby-editor-tmp'
 try{
  fs.writeFileSync(temp,updated,'utf8')
  fs.renameSync(temp,filename)
  try{compileWorlds()}catch(error){
   fs.writeFileSync(filename,current,'utf8')
   try{compileWorlds()}catch{}
   throw error
  }
  const backup=path.join(rootDir,'art','map-backups')
  fs.mkdirSync(backup,{recursive:true})
  const stamp=new Date().toISOString().replace(/[:.]/g,'-')
  fs.writeFileSync(path.join(backup,'web-editor-'+id+'-'+stamp+'.tmx'),current)
  return {status:200,body:{ok:true}}
 }catch(error){
  if(fs.existsSync(temp))fs.unlinkSync(temp)
  return {status:422,body:{error:'Karte nicht gespeichert: '+(error instanceof Error?error.message:String(error))}}
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
 if(req.method!=='POST'||req.url!=='/__nobby-editor/save'){
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
