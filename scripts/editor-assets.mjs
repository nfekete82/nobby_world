import {enemyGraphic} from '../src/art/enemies.mjs'
import fs from 'node:fs'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import sharp from 'sharp'
import {PNG} from 'pngjs'
import xml from 'xml-js'
import {EditorError,validId,safePath,hash,commitFiles,previousOperation} from './editor-storage.mjs'
import {userManifest,applyUserAssets} from './user-assets.mjs'
export const IMAGE_LIMITS=Object.freeze({bytes:12*1024*1024,pixels:16*1024*1024,frames:256,dimension:2048,atlas:8192})
export const ASSET_CATEGORIES=['Charaktere','Gegner','Tiere','Gebäude','Natur','Dekoration','Gelände','Effekte','Sonstige']
const arr=x=>x==null?[]:Array.isArray(x)?x:[x]
const clean=(x,max=120)=>String(x??'').replace(/[\x00-\x1f]/g,'').slice(0,max)
const json=data=>JSON.stringify(data,null,2)+'\n'
const baseRegistry=root=>JSON.parse(fs.readFileSync(safePath(root,'art/registry-base.json'),'utf8'))
function from64(value){
 if(typeof value!=='string')throw new EditorError('Bilddaten fehlen')
 const raw=value.replace(/^data:image\/(?:png|jpeg|webp|gif);base64,/, '')
 if(raw.length>IMAGE_LIMITS.bytes*4/3+8||!/^[-A-Za-z0-9+/=\s]+$/.test(raw))throw new EditorError('Bild zu groß oder ungültige Bilddaten',413)
 const buffer=Buffer.from(raw,'base64')
 if(!buffer.length||buffer.length>IMAGE_LIMITS.bytes)throw new EditorError('Bild zu groß (maximal 12 MB pro Datei)',413)
 return buffer
}
export async function decodeImage(value,{sheet=false}={}){
 const buffer=from64(value)
 // Sniff bytes before selecting a decoder; SVG/PDF/TIFF/executable inputs never reach raster decoding.
 const signature=buffer.subarray(0,12)
 const type=signature.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':
  signature[0]===255&&signature[1]===216&&signature[2]===255?'jpeg':
  /^GIF8[79]a/.test(signature.toString('ascii'))?'gif':
  signature.subarray(0,4).toString()==='RIFF'&&signature.subarray(8,12).toString()==='WEBP'?'webp':null
 if(!type)throw new EditorError('Nur echte PNG-, JPEG-, WebP- und GIF-Bilddateien sind erlaubt.')
 try{
  const input=sharp(buffer,{animated:true,limitInputPixels:IMAGE_LIMITS.pixels,failOn:'error'})
  const meta=await input.metadata(),count=meta.pages||1,fh=meta.pageHeight||meta.height
  if(meta.format!==type||count>IMAGE_LIMITS.frames||meta.width>(sheet?16384:IMAGE_LIMITS.dimension)||fh>(sheet?8192:IMAGE_LIMITS.dimension)||meta.width*fh*count>IMAGE_LIMITS.pixels)throw new EditorError('Bild-/Frame-Grenzen überschritten',413)
  const {data,info}=await input.ensureAlpha().toColourspace('srgb').timeout({seconds:8}).raw().toBuffer({resolveWithObject:true})
  const height=info.height/count,frames=[]
  if(!Number.isInteger(height)||info.width*info.height>IMAGE_LIMITS.pixels)throw new EditorError('Ungültige Animationsabmessungen',413)
  for(let f=0;f<count;f++){
   const png=new PNG({width:info.width,height});png.data.set(data.subarray(f*info.width*height*4,(f+1)*info.width*height*4))
   frames.push(PNG.sync.write(png).toString('base64'))
  }
  return {format:type,width:info.width,height,frames,durations:frames.map((_,i)=>Math.max(20,Math.min(10000,meta.delay?.[i]||100))),loop:meta.loop??0,original:buffer}
 }catch(error){if(error instanceof EditorError)throw error;throw new EditorError('Bild kann nicht sicher gelesen werden: '+clean(error.message,200))}
}
export async function importImages({files,layout}={}){
 if(!Array.isArray(files)||!files.length||files.length>IMAGE_LIMITS.frames)throw new EditorError('Bitte 1–256 Bilddateien wählen')
 const rows=[[]],durations=[],sources=[];let pixels=0,width=0,height=0
 for(const file of files){
  if(!/\.(png|jpe?g|webp|gif)$/i.test(file.name||''))throw new EditorError('Dateiendung nicht unterstützt: '+clean(file.name))
  const decoded=await decodeImage(file.data,{sheet:Boolean(layout)});pixels+=decoded.width*decoded.height*decoded.frames.length
  if(pixels>IMAGE_LIMITS.pixels)throw new EditorError('Insgesamt zu viele Bildpixel',413)
  sources.push({name:clean(file.name),format:decoded.format,sha256:hash(decoded.original)})
  if(layout&&decoded.frames.length===1){
   const fw=Number(layout.width),fh=Number(layout.height),directions=Number(layout.rows||1),p=PNG.sync.read(Buffer.from(decoded.frames[0],'base64'))
   if(layout.terrain){
    const columns=Number(layout.columns),count=p.width/fw*p.height/fh
    if(fw!==64||fh!==64||!Number.isInteger(columns)||columns<1||columns>128||p.width!==columns*fw||p.height%fh||!Number.isInteger(count)||count<1||count>256)throw new EditorError('Geländeatlas passt nicht zum 64-Pixel-Raster und zur Spaltenzahl.')
    for(let f=0;f<count;f++){const cell=new PNG({width:fw,height:fh});PNG.bitblt(p,cell,f%columns*fw,Math.floor(f/columns)*fh,fw,fh,0,0);rows[0].push(PNG.sync.write(cell).toString('base64'))}
    width=fw;height=fh;durations.push(...Array(count).fill(100))
   }else{
   if(!Number.isInteger(fw)||!Number.isInteger(fh)||fw<1||fh<1||fw>2048||fh>2048||![1,2,4].includes(directions)||p.width%fw||p.height!==fh*directions)throw new EditorError('Sheet passt nicht zur angegebenen Framegröße und Richtungszahl.')
   const count=p.width/fw;if(count>256)throw new EditorError('Zu viele Frames',413)
   for(let r=0;r<directions;r++){
    rows[r]??=[]
    for(let f=0;f<count;f++){const cell=new PNG({width:fw,height:fh});PNG.bitblt(p,cell,f*fw,r*fh,fw,fh,0,0);rows[r].push(PNG.sync.write(cell).toString('base64'))}
   }
   width=fw;height=fh;durations.push(...Array(count).fill(100))
   }
  }else{
   if(width&&(width!==decoded.width||height!==decoded.height))throw new EditorError('Einzelbilder haben unterschiedliche Größen. Keine automatische Verzerrung.')
   width=decoded.width;height=decoded.height;rows[0].push(...decoded.frames);durations.push(...decoded.durations)
  }
 }
 if(rows[0].length>256||rows.some(r=>r.length!==rows[0].length))throw new EditorError('Unvollständige oder zu lange Bildfolge')
 return {width,height,cells:rows,frameDurations:durations,sources,loop:true}
}
const category=(id,a)=>a.kind==='terrain'?'Gelände':a.kind==='effect'||/portal|effect|spell|marker/.test(id)?'Effekte':/^enemy-|scorpion|serpent|polar-bear/.test(id)?'Gegner':/sheep|snake/.test(id)?'Tiere':a.kind==='actor'?'Charaktere':/house|castle|tower|tent|temple/.test(id)?'Gebäude':/tree|fir|pine|palm|bush|shrub|fern|cactus|agave|prickly/.test(id)?'Natur':'Dekoration'
const biome=id=>/desert|sunscar/.test(id)?'Wüste':/snow|frost/.test(id)?'Schnee':/jungle|verdant/.test(id)?'Dschungel':'Alle'
function terrainAssets(root){
 const folder=safePath(root,'src/tiled'),result={}
 if(!fs.existsSync(folder))return result
 for(const name of fs.readdirSync(folder).filter(f=>f.endsWith('.tsx')&&!f.startsWith('user-'))){
  const relative='src/tiled/'+name,doc=xml.xml2js(fs.readFileSync(safePath(root,relative),'utf8'),{compact:true}).tileset,a=doc?._attributes,i=doc?.image?._attributes
  if(!a||!i||!Number(a.columns))continue
  const id='terrain-'+name.slice(0,-4),w=Number(a.tilewidth),h=Number(a.tileheight),n=Number(a.tilecount)
  const imagePath=path.relative(root,path.resolve(folder,i.source)).split(path.sep).join('/');safePath(root,imagePath)
  result[id]={kind:'terrain',frame:[w,h],foot:[w/2,h],hitbox:[w,h],tilesetPath:relative,tilesetRevision:hash(fs.readFileSync(safePath(root,relative))),terrainSource:imagePath,terrainColumns:Number(a.columns),terrainOriginalSource:i.source,
   animations:{stand:{image:'map/'+i.source,frames:n,rows:1,fps:1,loop:false,terrainGrid:true,visibleBounds:Array.from({length:n},()=>[0,0,w-1,h-1])}}}
 }
 return result
}
export function assetCatalog(root){
 const manifest=userManifest(root),base=baseRegistry(root),definitions={...base.assets,...terrainAssets(root)}
 for(const [id,e] of Object.entries(manifest.assets))definitions[id]=e.asset
 return {revision:manifest.revision,limits:IMAGE_LIMITS,trash:Object.entries(manifest.trash).map(([key,e])=>({key,id:e.id,name:e.name,deletedAt:e.deletedAt})),assets:Object.entries(definitions).map(([id,a])=>{
  const entry=manifest.assets[id],problems=[]
  for(const [state,s] of Object.entries(a.animations)){
   try{const file=s.terrainGrid?safePath(root,a.terrainSource):safePath(root,'public/'+s.image);const p=PNG.sync.read(fs.readFileSync(file))
    if(!s.terrainGrid&&(p.width!==a.frame[0]*s.frames||p.height!==a.frame[1]*(s.rows||1)))problems.push(state+': falsche Sheet-Abmessungen')
   }catch{problems.push(state+': Datei fehlt oder ist beschädigt')}
  }
  return {id,name:entry?.name||id.replaceAll('-',' '),category:entry?.category||category(id,a),biome:entry?.biome||biome(id),license:entry?.license||'Vorhandene Projektgrafik (siehe CREDITS.md)',sourceFiles:entry?.origins||Object.values(a.animations).map(s=>({path:s.image,format:'png'})),dependencies:a.editorBaseId?[a.editorBaseId]:[],protected:Boolean(base.assets[id]||definitions[id].terrainOriginalSource),owned:Boolean(entry),revision:entry?.revision||0,definition:a,problems}
 })}
}
export async function readAsset(root,id){
 const catalog=assetCatalog(root),entry=catalog.assets.find(a=>a.id===id)
 if(!entry)throw new EditorError('Asset nicht gefunden',404)
 const draft=structuredClone(entry);draft.asset=draft.definition;delete draft.definition
 for(const [name,s] of Object.entries(draft.asset.animations)){
  const file=s.terrainGrid?safePath(root,draft.asset.terrainSource):safePath(root,'public/'+s.image)
  const [fw,fh]=draft.asset.frame,rows=s.rows||1
  let p;try{p=PNG.sync.read(fs.readFileSync(file))}catch{p=new PNG({width:s.terrainGrid?draft.asset.terrainColumns*fw:fw*s.frames,height:s.terrainGrid?Math.ceil(s.frames/draft.asset.terrainColumns)*fh:fh*rows})}
  s.cells=Array.from({length:rows},()=>[])
  for(let r=0;r<rows;r++)for(let f=0;f<s.frames;f++){
   const q=new PNG({width:fw,height:fh}),sx=s.terrainGrid?(f%draft.asset.terrainColumns)*fw:f*fw,sy=s.terrainGrid?Math.floor(f/draft.asset.terrainColumns)*fh:r*fh
   if(sx+fw<=p.width&&sy+fh<=p.height)PNG.bitblt(p,q,sx,sy,fw,fh,0,0);s.cells[r].push(PNG.sync.write(q).toString('base64'))
  }
  s.frameDurations=s.frameDurations||Array(s.frames).fill(1000/s.fps);s.loop=s.loop!==false
 }
 return {revision:catalog.revision,draft}
}
export function assetUsage(root,id){
 if(!validId(id))throw new EditorError('Ungültige Asset-ID')
 const out=[],catalog=assetCatalog(root),asset=catalog.assets.find(a=>a.id===id)
 for(const folder of ['src/tiled','editor/templates']){
  const dir=safePath(root,folder);if(!fs.existsSync(dir))continue
  for(const name of fs.readdirSync(dir).filter(n=>/\.(tmx|tx)$/.test(n))){
   const doc=xml.xml2js(fs.readFileSync(safePath(root,folder+'/'+name),'utf8'),{compact:true})
   function scan(node){if(!node||typeof node!=='object')return
    for(const o of arr(node.object)){
     let base={}
     if(o._attributes?.template){const resolved=path.resolve(root,folder,o._attributes.template),relative=path.relative(root,resolved).split(path.sep).join('/');if(relative.startsWith('editor/')){try{base=xml.xml2js(fs.readFileSync(safePath(root,relative),'utf8'),{compact:true}).template.object}catch{}}}
     const attributes={...base._attributes,...o._attributes},properties=Object.fromEntries([...arr(base.properties?.property),...arr(o.properties?.property)].map(p=>[p._attributes?.name,p._attributes?.value]))
     const used=properties.asset||(attributes.class==='npc'?'female':attributes.class==='monster'?enemyGraphic(properties.enemy):attributes.class==='prop'?'tree-oak':null)
     if(used===id)out.push({file:folder+'/'+name,objectId:o._attributes?.id||'',name:o._attributes?.name||'Objekt',type:'object'})
    }
    if(asset?.definition.tilesetPath&&arr(node.tileset).some(t=>t._attributes?.source===path.basename(asset.definition.tilesetPath)))out.push({file:folder+'/'+name,type:'tileset',name:'Kachelebenen'})
    for(const [key,value] of Object.entries(node))if(key!=='object'&&key!=='_attributes')for(const child of arr(value))scan(child)
   }
   scan(doc)
  }
 }
 for(const [other,entry] of Object.entries(userManifest(root).assets))if(other!==id&&entry.asset.editorBaseId===id)out.push({type:'dependency',file:'art/user-assets/manifest.json',name:other+' basiert auf '+id})
 if(['hero','shaman','skeleton'].includes(id))out.push({type:'runtime',name:id==='skeleton'?'Beschworene Skelette (Schamanenfähigkeit)':'Spielerklasse auf allen Karten'})
 if(asset?.protected)out.push({type:'base',name:'Geschützte Basisgrafik; kann ersetzt, aber nicht aus der Bibliothek gelöscht werden.'})
 return out
}
function dimensions(a){
 for(const key of ['frame','foot','hitbox'])if(!Array.isArray(a[key])||a[key].length!==2||a[key].some(v=>!Number.isFinite(v)))throw new EditorError('Ungültige Geometrie: '+key)
 if(a.frame.some(v=>!Number.isInteger(v)||v<1||v>2048)||a.foot.some((v,i)=>v<0||v>a.frame[i])||a.hitbox.some(v=>v<1||v>2048))throw new EditorError('Frame, Anker oder Hitbox außerhalb der Grenzen')
 if(!['actor','prop','effect','terrain'].includes(a.kind))throw new EditorError('Unbekannte Asset-Art')
}
const revisionWrites=(root,manifest,extra=[])=>{
 const base=baseRegistry(root),runtime=applyUserAssets(base,manifest)
 return [...extra,{path:'art/user-assets/manifest.json',data:json(manifest),expected:hash(fs.readFileSync(safePath(root,'art/user-assets/manifest.json')))},
  {path:'src/art/registry.json',data:json(runtime),expected:hash(fs.readFileSync(safePath(root,'src/art/registry.json')))}]
}
export async function saveAsset(root,data,{signal}={}){
 const {id,draft,baseRevision,operationId=randomUUID()}=data||{}
 if(!validId(id)||!validId(operationId)||!draft?.asset)throw new EditorError('Ungültige Asset-Daten')
 const fingerprint=hash(JSON.stringify({id,draft,baseRevision})),replay=previousOperation(root,operationId,fingerprint)
 if(replay){const latest=userManifest(root);if(latest.assets[id]?.revision!==replay.assetRevision)throw new EditorError('Der gespeicherte Asset-Stand wurde inzwischen geändert. Entwurf bleibt erhalten.',409);return {...replay,revision:latest.revision}}
 const manifest=userManifest(root);if(manifest.revision!==baseRevision)throw new EditorError('Asset-Bibliothek wurde inzwischen geändert. Entwurf bleibt erhalten; Bibliothek erneut laden.',409)
 const catalog=assetCatalog(root),existing=catalog.assets.find(e=>e.id===id),base=baseRegistry(root),asset=structuredClone(draft.asset)
 dimensions(asset)
 if(existing&&asset.kind!==existing.definition.kind)throw new EditorError('Asset-Art bestehender IDs darf zum Schutz der Kartenreferenzen nicht geändert werden. Neues Asset anlegen.')
 if(asset.editorBaseId&&!catalog.assets.some(e=>e.id===asset.editorBaseId))throw new EditorError('Unbekannte Basis-Asset-ID')
 if(asset.kind==='terrain'){
  if(!Number.isInteger(asset.terrainColumns)||asset.terrainColumns<1||asset.terrainColumns>128||asset.frame.some(v=>v!==64))throw new EditorError('Gelände benötigt 64 × 64 Pixel und 1–128 Spalten')
  if(existing&&(existing.definition.kind!=='terrain'||asset.terrainColumns!==existing.definition.terrainColumns))throw new EditorError('Bestehendes Geländeraster muss erhalten bleiben')
 }else if(existing?.definition.kind==='terrain')throw new EditorError('Gelände-Art muss erhalten bleiben')
 if(Object.keys(asset.animations||{}).length<1||Object.keys(asset.animations).length>32)throw new EditorError('1–32 Animationen erforderlich')
 if(existing?.protected&&asset.hitbox.some((v,i)=>v!==existing.definition.hitbox[i]))throw new EditorError('Hitbox geschützter Basisgrafiken bleibt für Spielstände und Gameplay erhalten')
 const required=base.assets[id]?.animations||base.assets[asset.editorBaseId]?.animations||{stand:{},...(asset.kind==='actor'?{walk:{}}:{})}
 for(const state of Object.keys(required))if(!asset.animations[state])throw new EditorError('Pflichtanimation darf nicht entfernt werden: '+state)
 const rev=randomUUID(),prefix=`tiny-swords/user/${id}/${rev}`,sourcePrefix=`art/user-assets/revisions/${id}/${rev}`,writes=[];let totalPixels=0
 for(const [state,animation] of Object.entries(asset.animations)){
  if(!validId(state))throw new EditorError('Ungültiger Animationsname')
  const rows=animation.cells?.length,count=animation.cells?.[0]?.length,[fw,fh]=asset.frame
  if(![1,2,4].includes(rows)||!count||count>256||fw*count>(asset.kind==='terrain'?16384:8192)||animation.cells.some(r=>r.length!==count)||!Number.isFinite(animation.fps)||animation.fps<.1||animation.fps>60)throw new EditorError('Ungültige Framezahl/Richtungen/FPS oder Sheet breiter als 8192 Pixel')
  totalPixels+=fw*fh*rows*count;if(totalPixels>IMAGE_LIMITS.pixels)throw new EditorError('Asset hat zu viele Pixel',413)
  const output=new PNG({width:fw*count,height:fh*rows})
  for(let r=0;r<rows;r++)for(let f=0;f<count;f++){
   if(signal?.aborted)throw new EditorError('Speichern abgebrochen; Entwurf bleibt erhalten.',499)
   const cell=await decodeImage(animation.cells[r][f]);if(cell.frames.length!==1||cell.width!==fw||cell.height!==fh)throw new EditorError('Einzelbild passt nicht zur Framegröße; keine automatische Skalierung.')
   const png=PNG.sync.read(Buffer.from(cell.frames[0],'base64'));PNG.bitblt(png,output,0,0,fw,fh,f*fw,r*fh)
   writes.push({path:`${sourcePrefix}/${state}-${r}-${f}.png`,data:PNG.sync.write(png),expected:hash('')})
  }
  const durations=animation.frameDurations||Array(count).fill(1000/animation.fps)
  if(durations.length!==count||durations.some(d=>!Number.isFinite(d)||d<16||d>10000))throw new EditorError('Frame-Dauer muss zwischen 16 und 10.000 ms liegen')
  animation.image=`${prefix}/${state}.png`;animation.frames=count;animation.rows=rows;animation.frameDurations=durations;animation.directions=rows===4?['down','up','left','right']:undefined
  animation.visibleBounds=Array.from({length:count},(_,f)=>{let b=[fw,fh,-1,-1];for(let y=0;y<fh;y++)for(let x=0;x<fw;x++)if(output.data[(y*output.width+f*fw+x)*4+3])b=[Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)];return b[2]<0?[0,0,0,0]:b})
  delete animation.cells;delete animation.terrainGrid
  writes.push({path:'public/'+animation.image,data:PNG.sync.write(output),expected:hash('')})
  if(asset.kind==='terrain'){
   if(state!=='stand'||rows!==1||existing&&count!==existing.definition.animations.stand.frames)throw new EditorError('Bestehende Gelände-Kachelanzahl und Reihenfolge müssen erhalten bleiben.')
   const columns=asset.terrainColumns||Math.min(8,count);if(Math.ceil(count/columns)*fh>8192)throw new EditorError('Gelände-Atlas ist höher als 8192 Pixel');const atlas=new PNG({width:columns*fw,height:Math.ceil(count/columns)*fh})
   for(let f=0;f<count;f++)PNG.bitblt(output,atlas,f*fw,0,fw,fh,(f%columns)*fw,Math.floor(f/columns)*fh)
   const imagePath=`src/tiled/tiny-swords/user/${id}/${rev}.png`;writes.push({path:imagePath,data:PNG.sync.write(atlas),expected:hash('')})
   asset.tilesetPath=existing?.definition.tilesetPath||`src/tiled/user-${id}.tsx`
   const tsxFile=safePath(root,asset.tilesetPath),previous=fs.existsSync(tsxFile)?fs.readFileSync(tsxFile,'utf8'):null
   const doc=previous?xml.xml2js(previous,{compact:true}):{_declaration:{_attributes:{version:'1.0',encoding:'UTF-8'}},tileset:{_attributes:{version:'1.10',name:id,tilewidth:fw,tileheight:fh,tilecount:count,columns},image:{_attributes:{}}}}
   if(existing&&draft.asset.tilesetRevision&&hash(previous)!==draft.asset.tilesetRevision)throw new EditorError('Tileset wurde extern geändert; bitte neu laden.',409)
   asset.terrainOriginalSource=manifest.assets[id]?.asset.terrainOriginalSource||existing?.definition.terrainOriginalSource
   doc.tileset.image._attributes={source:`tiny-swords/user/${id}/${rev}.png`,width:atlas.width,height:atlas.height}
   const text=xml.js2xml(doc,{compact:true,spaces:1});asset.tilesetRevision=hash(text);asset.terrainSource=imagePath
   writes.push({path:asset.tilesetPath,data:text,expected:hash(previous||'')})
  }
 }
 const origins=manifest.assets[id]?.origins||[]
 for(const [i,source] of (draft.imports||[]).entries()){
  const decoded=await decodeImage(source.data,{sheet:true}),relative=`${sourcePrefix}/original-${i}.${decoded.format}`
  writes.push({path:relative,data:decoded.original,expected:hash('')});origins.push({name:clean(source.name),path:relative,format:decoded.format,sha256:hash(decoded.original)})
 }
 if(signal?.aborted)throw new EditorError('Speichern abgebrochen; Entwurf bleibt erhalten.',499)
 asset.editorManaged=true
 const entry={id,name:clean(draft.name)||id,category:ASSET_CATEGORIES.includes(draft.category)?draft.category:category(id,asset),biome:clean(draft.biome,30)||'Alle',license:clean(draft.license,500)||'Vom Benutzer importiert; Rechte beim Urheber.',revision:(manifest.assets[id]?.revision||0)+1,asset,origins}
 manifest.assets[id]=entry;manifest.revision++
 const result={ok:true,id,revision:manifest.revision,assetRevision:entry.revision,needsRefresh:true}
 return commitFiles(root,{id:operationId,fingerprint,writes:revisionWrites(root,manifest,writes),result})
}
export function deleteAsset(root,{id,baseRevision,operationId=randomUUID(),reset=false}={}){
 if(!validId(id)||!validId(operationId))throw new EditorError('Ungültige Asset-ID')
 const fingerprint=hash(JSON.stringify({id,baseRevision,reset})),replay=previousOperation(root,operationId,fingerprint);if(replay){const latest=userManifest(root);if(!latest.trash[replay.trashId])throw new EditorError('Papierkorbstand wurde inzwischen geändert',409);return {...replay,revision:latest.revision}}
 const manifest=userManifest(root),catalog=assetCatalog(root),asset=catalog.assets.find(a=>a.id===id)
 if(manifest.revision!==baseRevision)throw new EditorError('Bibliothek wurde inzwischen geändert',409)
 if(!asset||!manifest.assets[id])throw new EditorError('Nur eigene Assets/Änderungen können gelöscht werden')
 if(asset.protected&&!reset)throw new EditorError('Basis-Asset ist geschützt. Nur eigene Änderungen können zurückgesetzt werden.')
 const usage=assetUsage(root,id).filter(u=>u.type!=='base')
 if(!reset&&usage.length)throw new EditorError('Asset wird verwendet: '+usage.map(u=>u.file+' '+u.objectId).join(', '),409)
 const key=randomUUID(),entry=manifest.assets[id],extra=[]
 if(entry.asset.kind==='terrain'){
  const current=fs.readFileSync(safePath(root,entry.asset.tilesetPath),'utf8'),doc=xml.xml2js(current,{compact:true})
  if(reset&&entry.asset.terrainOriginalSource){doc.tileset.image._attributes.source=entry.asset.terrainOriginalSource;extra.push({path:entry.asset.tilesetPath,data:xml.js2xml(doc,{compact:true,spaces:1}),expected:hash(current)})}
  // A custom unused tileset stays as a recoverable source, excluded from discovery.
 }
 manifest.trash[key]={...entry,id,deletedAt:new Date().toISOString(),reset};delete manifest.assets[id];manifest.revision++
 return commitFiles(root,{id:operationId,fingerprint:hash(JSON.stringify({id,baseRevision,reset})),writes:revisionWrites(root,manifest,extra),result:{ok:true,revision:manifest.revision,trashId:key,needsRefresh:true}})
}
export function restoreAsset(root,{key,baseRevision,operationId=randomUUID()}={}){
 if(!validId(key)||!validId(operationId))throw new EditorError('Ungültiger Papierkorbeintrag')
 const fingerprint=hash(JSON.stringify({key,baseRevision})),replay=previousOperation(root,operationId,fingerprint);if(replay){const latest=userManifest(root);if(latest.assets[replay.id]?.revision!==replay.assetRevision)throw new EditorError('Wiederhergestellter Stand wurde inzwischen geändert',409);return {...replay,revision:latest.revision}}
 const manifest=userManifest(root),entry=manifest.trash[key]
 if(manifest.revision!==baseRevision)throw new EditorError('Bibliothek wurde inzwischen geändert',409)
 if(!entry)throw new EditorError('Papierkorbeintrag nicht gefunden',404)
 if(manifest.assets[entry.id])throw new EditorError('Diese ID ist inzwischen wieder belegt',409)
 manifest.assets[entry.id]=entry;delete manifest.trash[key];manifest.revision++
 const extra=[]
 if(entry.asset.kind==='terrain'){
  const file=safePath(root,entry.asset.tilesetPath),current=fs.readFileSync(file,'utf8'),doc=xml.xml2js(current,{compact:true})
  doc.tileset.image._attributes.source=path.relative(path.dirname(file),safePath(root,entry.asset.terrainSource)).split(path.sep).join('/')
  extra.push({path:entry.asset.tilesetPath,data:xml.js2xml(doc,{compact:true,spaces:1}),expected:hash(current)})
 }
 return commitFiles(root,{id:operationId,fingerprint:hash(JSON.stringify({key,baseRevision})),writes:revisionWrites(root,manifest,extra),result:{ok:true,id:entry.id,revision:manifest.revision,assetRevision:entry.revision,needsRefresh:true}})
}
