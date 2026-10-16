export class EditorClient{
 constructor(base='/'){this.base=base;this.token='';this.writable=false;this.connected=null;this.heartbeat=null}
 async connect(){
  if(this.connected)return this.connected
  this.connected=this.request('session',{}, {session:false}).then(result=>{this.token=result.token;this.writable=result.writable;return result}).catch(error=>{this.connected=null;throw error})
  return this.connected
 }
 async request(route,payload={}, {signal,timeout=25000,session=true}={}){
  if(session&&!this.token)await this.connect()
  const controller=new AbortController(),abort=()=>controller.abort()
  if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',abort,{once:true})
  const timer=setTimeout(()=>controller.abort(),timeout)
  try{
   const response=await fetch(this.base+'__nobby-editor/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Nobby-Editor':'local-authoring',...(this.token?{'X-Nobby-Editor-Token':this.token}:{})},body:JSON.stringify(payload),signal:controller.signal})
   const value=await response.json()
   if(!response.ok){const error=new Error(value.error||'Editor-Anfrage fehlgeschlagen');error.status=response.status;throw error}
   return value
  }catch(error){if(controller.signal.aborted){const e=new Error(signal?.aborted?'Vorgang abgebrochen. Entwurf bleibt erhalten.':'Zeitüberschreitung. Entwurf bleibt erhalten; Speichern sicher erneut versuchen.');e.uncertain=true;throw e}throw error}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
 }
 async start(){await this.connect();await this.request('heartbeat');this.heartbeat=setInterval(()=>void this.request('heartbeat',{}, {timeout:4000}).catch(()=>{}),5000)}
 async close(){clearInterval(this.heartbeat);try{await this.request('close',{}, {timeout:3000})}catch{}}
}
// Pure save state: a response acknowledges only the exact snapshot sent.
export class SaveSnapshot{
 constructor(){this.pending=null;this.saving=false}
 begin(id,source,updated){if(this.saving)return null;this.saving=true;return this.pending??={id,original:source,updated,operationId:crypto.randomUUID()}}
 acknowledge(current){const sent=this.pending;this.pending=null;return {source:sent.updated,dirty:current!==sent.updated}}
 finish(){this.saving=false}
}
export async function writeDraft(key,value){
 try{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('nobby-editor-drafts',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})
  await new Promise((resolve,reject)=>{const t=db.transaction('drafts','readwrite');t.objectStore('drafts').put(value,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error)});db.close()
 }catch{}
}
export async function readDraft(key){
 try{return await new Promise(resolve=>{const r=indexedDB.open('nobby-editor-drafts',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts');r.onerror=()=>resolve(null);r.onsuccess=()=>{const db=r.result,t=db.transaction('drafts'),get=t.objectStore('drafts').get(key);get.onsuccess=()=>{resolve(get.result);db.close()};get.onerror=()=>{resolve(null);db.close()}}})}catch{return null}
}
