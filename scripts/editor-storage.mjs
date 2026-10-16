import fs from 'node:fs'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
export const hash=value=>createHash('sha256').update(value).digest('hex')
export const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,69}$/.test(id)&&!['constructor','prototype','__proto__'].includes(id)
export class EditorError extends Error{constructor(message,status=400){super(message);this.status=status}}
export function safePath(root,relative){
 if(typeof relative!=='string'||path.isAbsolute(relative)||relative.split(/[\\/]/).some(p=>p==='..'||p==='.'||!p))throw new EditorError('Ungültiger Dateipfad')
 const base=path.resolve(root),file=path.resolve(base,relative)
 if(!file.startsWith(base+path.sep))throw new EditorError('Pfad außerhalb des Projekts')
 let current=base
 for(const part of relative.split('/')){current=path.join(current,part);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw new EditorError('Symbolische Links sind für Schreibzugriffe nicht erlaubt')}
 return file
}
export function atomicWrite(file,data){
 fs.mkdirSync(path.dirname(file),{recursive:true})
 const tmp=file+'.tmp-'+randomUUID();let fd
 try{fd=fs.openSync(tmp,'wx',0o600);fs.writeFileSync(fd,data);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(tmp,file)
  const dir=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(dir)}finally{fs.closeSync(dir)}
 }finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(tmp))fs.unlinkSync(tmp)}
}
export const readJSON=(root,relative,fallback)=>{const p=safePath(root,relative);return fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):structuredClone(fallback)}
export function audit(root,event){const file=safePath(root,'art/editor-history/events.jsonl');fs.mkdirSync(path.dirname(file),{recursive:true});fs.appendFileSync(file,JSON.stringify({time:new Date().toISOString(),...event})+'\n')}
const queues=new Map()
export async function serial(root,fn){const key=path.resolve(root),prior=queues.get(key)||Promise.resolve();let release;const gate=new Promise(r=>release=r);const tail=prior.then(()=>gate);queues.set(key,tail);await prior;try{return await fn()}finally{release();if(queues.get(key)===tail)queues.delete(key)}}
function lock(root){
 const file=safePath(root,'art/editor-history/write.lock');fs.mkdirSync(path.dirname(file),{recursive:true})
 try{const fd=fs.openSync(file,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,created:Date.now()}));return()=>{fs.closeSync(fd);fs.unlinkSync(file)}}catch(e){
  if(e.code!=='EEXIST')throw e
  let stale=false;try{const owner=JSON.parse(fs.readFileSync(file));try{process.kill(owner.pid,0)}catch(err){stale=err.code==='ESRCH'}}catch{stale=Date.now()-fs.statSync(file).mtimeMs>60000}
  if(stale){fs.unlinkSync(file);return lock(root)}
  throw new EditorError('Eine andere Editor-Instanz schreibt gerade. Bitte erneut versuchen.',423)
 }
}
const journalPath=id=>'art/editor-history/operations/'+id+'.json'
export function previousOperation(root,id,fingerprint){
 if(!id)return null
 if(!validId(id))throw new EditorError('Ungültige Vorgangs-ID')
 const entry=readJSON(root,journalPath(id),null)
 if(entry&&entry.fingerprint!==fingerprint)throw new EditorError('Vorgangs-ID gehört zu anderen Änderungen',409)
 return entry?.phase==='committed'?entry.result:null
}
/** Write-ahead record + immutable inputs + atomic publication of registry/manifest.
 * On failure only our own published bytes are rolled back; external edits survive. */
export function commitFiles(root,{id=randomUUID(),fingerprint,writes,result,beforeCommit}){
 const release=lock(root)
 try{
  const replay=previousOperation(root,id,fingerprint);if(replay)return replay
  const entries=writes.map(w=>{const file=safePath(root,w.path);const before=fs.existsSync(file)?fs.readFileSync(file):null
   if(w.expected!==undefined&&hash(before||'')!==w.expected)throw new EditorError('Externer Bearbeitungskonflikt: Datei wurde inzwischen geändert.',409)
   return {path:w.path,before:before?.toString('base64')??null,after:Buffer.from(w.data).toString('base64')}
  })
  const journal={id,fingerprint,phase:'prepared',created:new Date().toISOString(),entries,result}
  const file=safePath(root,journalPath(id));atomicWrite(file,JSON.stringify(journal))
  try{
   beforeCommit?.()
   for(const entry of entries){
    const dest=safePath(root,entry.path),current=fs.existsSync(dest)?fs.readFileSync(dest):null
    if((current?.toString('base64')??null)!==entry.before)throw new EditorError('Externe Änderung während des Speicherns; nichts überschrieben.',409)
    atomicWrite(dest,Buffer.from(entry.after,'base64'))
    if(!fs.readFileSync(dest).equals(Buffer.from(entry.after,'base64')))throw new EditorError('Dateiprüfung nach dem Schreiben fehlgeschlagen',409)
   }
   journal.phase='committed';atomicWrite(file,JSON.stringify(journal));audit(root,{id,status:'committed',paths:entries.map(e=>e.path)})
   return result
  }catch(error){
   for(const entry of entries.slice().reverse()){
    const dest=safePath(root,entry.path)
    if(fs.existsSync(dest)&&fs.readFileSync(dest).toString('base64')===entry.after){
     if(entry.before===null)fs.unlinkSync(dest);else atomicWrite(dest,Buffer.from(entry.before,'base64'))
    }
   }
   journal.phase='rolled-back';journal.error=String(error);atomicWrite(file,JSON.stringify(journal));audit(root,{id,status:'rolled-back',error:String(error)});throw error
  }
 }finally{release()}
}
export function recoverTransactions(root){
 const directory=safePath(root,'art/editor-history/operations');if(!fs.existsSync(directory))return
 const release=lock(root)
 try{for(const name of fs.readdirSync(directory).filter(f=>f.endsWith('.json'))){
  const file=safePath(root,'art/editor-history/operations/'+name),entry=JSON.parse(fs.readFileSync(file));if(entry.phase!=='prepared')continue
  const values=entry.entries.map(e=>{const p=safePath(root,e.path);return fs.existsSync(p)?fs.readFileSync(p).toString('base64'):null})
  if(values.every((v,i)=>v===entry.entries[i].after))entry.phase='committed'
  else if(values.every((v,i)=>v===entry.entries[i].before||v===entry.entries[i].after)){
   for(const e of entry.entries){const p=safePath(root,e.path);if(e.before===null){if(fs.existsSync(p))fs.unlinkSync(p)}else atomicWrite(p,Buffer.from(e.before,'base64'))}
   entry.phase='rolled-back'
  }else{entry.phase='external-conflict';audit(root,{id:entry.id,status:'recovery-conflict'})}
  atomicWrite(file,JSON.stringify(entry))
 }}finally{release()}
}

export function withStorageLock(root,fn){const release=lock(root);try{return fn()}finally{release()}}
