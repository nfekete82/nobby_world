import {EditorClient,readDraft,writeDraft} from './editor-client.mjs'
import './asset-editor.css'
const el=(tag:string,cls='',text='')=>{const e=document.createElement(tag);e.className=cls;e.textContent=text;return e}
const btn=(text:string,fn:()=>void,cls='')=>{const b=el('button',cls,text) as HTMLButtonElement;b.type='button';b.onclick=fn;return b}
const label=(text:string,input:HTMLElement)=>{const l=el('label','ae-field');l.append(el('span','',text),input);return l}
const input=(value:any,type='text')=>{const i=document.createElement('input');i.type=type;i.value=String(value);return i}
const select=(items:[string,string][],value:string)=>{const s=document.createElement('select');for(const [v,t] of items){const o=document.createElement('option');o.value=v;o.textContent=t;s.append(o)}s.value=value;return s}
const names:any={stand:'Stand / Idle',walk:'Laufen / Walk',attack:'Angriff / Attack',heal:'Zaubern / Beschwören',cast:'Zaubern / Cast',hit:'Treffer / Hit',death:'Tod / Death',graze:'Grasen',spawn:'Erscheinen / Spawn'}
const categories=['Charaktere','Gegner','Tiere','Gebäude','Natur','Dekoration','Gelände','Effekte','Sonstige']
const fileURL=(p:string)=>import.meta.env.BASE_URL+p.split('/').map(encodeURIComponent).join('/')
const pngURL=(p:string)=>p.startsWith('data:')?p:'data:image/png;base64,'+p
const clone=<T>(x:T):T=>structuredClone(x)
const decode=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Bild fehlt oder ist beschädigt'));i.src=src})
const encodeFile=async(file:File)=>{const bytes=new Uint8Array(await file.arrayBuffer());let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));return {name:file.name,data:btoa(str)}}
const blank=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c.toDataURL('image/png').split(',')[1]}
type Hooks={back:()=>void,changed:(catalog:any)=>Promise<void>|void,variant:(id:string)=>void,context:()=>string|null,dirty:()=>void}
export class AssetEditor{
 root=el('section','we-assets')
 dirty=false;saving=false;visible=false
 private catalog:any={assets:[],trash:[],revision:0}
 private draft:any=null;private id='';private state='stand';private row=0;private frame=0;private zoom=2;private playing=false
 private chooseSequence=0;private version=0;private pending:any=null;private request:AbortController|null=null;private scope='global'
 private images=new Map<string,HTMLImageElement>();private raf=0;private started=0;private paintSequence=0
 private list=el('div','ae-list');private detail=el('main','ae-detail');private status=el('p','ae-status','Asset auswählen')
 private search=input('','search');private filter=select([['Alle','Alle Kategorien'],...categories.map(c=>[c,c] as [string,string])],'Alle')
 private biome=select(['Alle','Wald','Wüste','Schnee','Dschungel'].map(c=>[c,c]),'Alle')
 private animated=select([['all','Alle Animationen'],['yes','Animiert'],['no','Einzelbilder'],['broken','Fehlerhaft / fehlend']],'all')
 private stage=el('div','ae-stage');private canvas=document.createElement('canvas');private comparison=document.createElement('canvas')
 private timeline=el('div','ae-timeline');private details=el('aside','ae-inspector');private tabs=el('div','ae-animation-tabs');private usage=el('div','ae-usage')
 private buttons=el('div','ae-controls');private background='checker';private anchor=true;private onion=false;private comparisonId=''
 constructor(private client:EditorClient,private hooks:Hooks){
  this.root.hidden=true;this.root.setAttribute('aria-label','Grafiken & Animationen')
  const sidebar=el('aside','ae-library'),heading=el('div','ae-library-header')
  this.search.placeholder='Name oder Asset-ID suchen';this.search.setAttribute('aria-label','Assets suchen')
  this.filter.setAttribute('aria-label','Asset-Kategorie');this.biome.setAttribute('aria-label','Asset-Biom');this.animated.setAttribute('aria-label','Animationsfilter')
  for(const control of [this.search,this.filter,this.biome,this.animated])control.oninput=()=>this.renderList()
  heading.append(el('h2','','Grafiken & Animationen'),btn('← Zur Karte',()=>this.back()),label('Suche',this.search),this.filter,this.biome,this.animated)
  const actions=el('div','ae-library-actions');actions.append(btn('+ Neues Asset',()=>this.create()),btn('Papierkorb',()=>void this.trash()))
  if(!import.meta.env.DEV)for(const b of actions.querySelectorAll('button'))b.disabled=true
  sidebar.append(heading,actions,this.list)
  const right=el('div','ae-workspace');this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');right.append(this.detail,this.status)
  this.root.append(sidebar,right)
  this.root.ondragover=e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();this.root.classList.add('ae-drop-active')}}
  this.root.ondragleave=()=>this.root.classList.remove('ae-drop-active')
  this.root.ondrop=e=>{this.root.classList.remove('ae-drop-active');if(e.dataTransfer?.files.length){e.preventDefault();void this.importFiles([...e.dataTransfer.files],'frame')}}
 }
 async open(id?:string){this.visible=true;this.root.hidden=false;try{await this.reload();const last:any=await readDraft('asset:last');if(!this.draft&&last?.draft&&confirm('Lokalen Asset-Entwurf wiederherstellen?')){this.draft=last.draft;this.id=last.id;this.scope=last.scope;this.version=last.version;this.pending=last.pending;this.dirty=true;this.state=this.draft.asset.animations.walk?'walk':'stand';this.render();return;}if(id&&id!==this.id)await this.choose(id);else if(!this.draft)await this.choose(this.catalog.assets[0]?.id)}catch(e){this.message(String(e))}}
 back(){this.playing=false;cancelAnimationFrame(this.raf);this.visible=false;this.root.hidden=true;this.hooks.back()}
 async reload(){if(import.meta.env.DEV)this.catalog=await this.client.request('catalog');else{const response=await fetch(fileURL('editor-catalog.json'));if(!response.ok)throw Error('Asset-Bibliothek konnte nicht geladen werden');this.catalog=await response.json()}this.renderList()}
 private async readAsset(id:string){
  if(import.meta.env.DEV)return this.client.request('assets/read',{id})
  const entry=this.catalog.assets.find((a:any)=>a.id===id);if(!entry)throw Error('Asset fehlt')
  const draft=clone(entry);draft.asset=draft.definition;delete draft.definition
  for(const s of Object.values(draft.asset.animations) as any[]){
   const image=await this.image(fileURL(s.image)),[w,h]=draft.asset.frame;s.cells=Array.from({length:s.rows||1},()=>[])
   for(let row=0;row<s.cells.length;row++)for(let f=0;f<s.frames;f++){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.drawImage(image,s.terrainGrid?f%draft.asset.terrainColumns*w:f*w,s.terrainGrid?Math.floor(f/draft.asset.terrainColumns)*h:row*h,w,h,0,0,w,h);s.cells[row].push(c.toDataURL('image/png').split(',')[1])}
   s.frameDurations||=Array(s.frames).fill(1000/s.fps);s.loop=s.loop!==false
  }return {draft,revision:this.catalog.revision}
 }
 private message(text:string){this.status.textContent=text}
 private changed(){this.version++;this.dirty=true;this.message('Ungespeichert · '+(this.scope==='variant'?'neue Objektvariante':'gilt für alle Instanzen von '+this.id));const recovery={draft:this.draft,scope:this.scope,version:this.version,pending:this.pending,id:this.id};void writeDraft('asset:'+this.id,recovery);void writeDraft('asset:last',recovery);this.hooks.dirty()}
 private async image(src:string){if(!this.images.has(src))this.images.set(src,await decode(src));return this.images.get(src)!}
 private thumb(target:HTMLCanvasElement,src:string,fw:number,fh:number,sx=0,sy=0){const ctx=target.getContext('2d')!;ctx.imageSmoothingEnabled=false;void this.image(src).then(img=>{ctx.clearRect(0,0,target.width,target.height);const scale=Math.min(target.width/fw,target.height/fh);ctx.drawImage(img,sx,sy,fw,fh,(target.width-fw*scale)/2,(target.height-fh*scale)/2,fw*scale,fh*scale)}).catch(()=>{ctx.clearRect(0,0,target.width,target.height);target.title='Datei fehlt oder ist beschädigt'})}
 private renderList(){
  this.list.replaceChildren();const term=this.search.value.toLowerCase()
  for(const a of this.catalog.assets){
   const moving=Object.values(a.definition.animations).some((s:any)=>s.frames>1)
   if(![a.name,a.id].join(' ').toLowerCase().includes(term)||this.filter.value!=='Alle'&&a.category!==this.filter.value||this.biome.value!=='Alle'&&a.biome!=='Alle'&&a.biome!==this.biome.value||this.animated.value==='yes'&&!moving||this.animated.value==='no'&&moving||this.animated.value==='broken'&&!a.problems.length)continue
   const b=btn('',()=>void this.choose(a.id),'ae-asset-card');b.dataset.assetId=a.id;b.classList.toggle('ae-selected',a.id===this.id)
   const c=document.createElement('canvas');c.width=64;c.height=64
   const s=a.definition.animations.stand;this.thumb(c,fileURL(s.image),...a.definition.frame as [number,number])
   const text=el('span');text.append(el('strong','',a.name),el('small','',a.id+' · '+a.category),el('small',a.problems.length?'ae-error':'',a.problems.length?a.problems.join(' · '):a.owned?'Eigene Bearbeitung':a.protected?'Basisgrafik':'Projektgrafik'))
   b.append(c,text);this.list.append(b)
  }
 }
 private async choose(id:string){
  if(!id)return
  if(this.dirty&&id!==this.id&&!confirm('Aktuellen Entwurf behalten und später fortsetzen? Er wird lokal gesichert.'))return
  const sequence=++this.chooseSequence;this.detail.inert=true;this.message('Asset wird geladen …')
  try{
   const response=await this.readAsset(id);if(sequence!==this.chooseSequence)return;this.draft=response.draft;this.id=id;this.scope='global';this.version=0;this.dirty=false;this.pending=null
   const recovery:any=await readDraft('asset:'+id)
   if(recovery?.draft&&confirm('Ein lokaler ungespeicherter Entwurf für '+id+' ist vorhanden. Wiederherstellen?')){this.draft=recovery.draft;this.scope=recovery.scope||'global';this.dirty=true;this.version=recovery.version;this.pending=recovery.pending||null}
   this.catalog.revision=response.revision;this.state=this.draft.asset.animations.walk?'walk':'stand';this.row=0;this.frame=0;this.playing=false
   this.renderList();this.render();this.message(this.dirty?'Lokaler Entwurf wiederhergestellt · ungespeichert':'Geladen · Änderungen betreffen alle Instanzen dieses Assets.');if(import.meta.env.DEV)void this.showUsage()
  }catch(e){if(sequence===this.chooseSequence)this.message(String(e))}finally{if(sequence===this.chooseSequence)this.detail.inert=false}
 }
 private current(){return this.draft?.asset.animations[this.state]}
 private render(){
  if(!this.draft)return
  this.detail.replaceChildren();this.tabs.replaceChildren();this.buttons.replaceChildren();this.details.replaceChildren();this.stage.replaceChildren();this.timeline.replaceChildren()
  const title=el('header','ae-title');title.append(el('div','',this.draft.name+' · '+this.id))
  const actions=el('div','ae-actions');actions.append(btn(this.saving?'Wird gespeichert …':'💾 Asset speichern',()=>void this.save(),'we-primary'),btn('Abbrechen',()=>this.request?.abort()),btn('Duplizieren',()=>this.duplicate()),btn('Entwurf herunterladen',()=>this.exportDraft()))
  if(this.draft.owned)actions.append(btn(this.draft.protected?'Eigene Änderungen zurücksetzen':'Asset löschen',()=>void this.removeAsset()))
  title.append(actions)
  const scope=select([['global','Alle Instanzen dieses Assets'],...(this.hooks.context()?[['variant','Nur ausgewähltes Kartenobjekt (eigene Asset-ID)'] as [string,string]]:[])],this.scope)
  scope.setAttribute('aria-label','Änderungsbereich');scope.onchange=()=>{this.scope=scope.value;this.changed()}
  const scopeNotice=el('div','ae-scope');scopeNotice.append(label('Änderungsbereich',scope),el('p','',this.scope==='global'?'Eine Asset-Bearbeitung gilt für alle Verwendungen dieser ID. Originaldateien bleiben erhalten.':'Beim Speichern wird eine neue Grafik-ID angelegt und nur dem ausgewählten Kartenobjekt zugewiesen. Danach Karte separat speichern.'))
  for(const [key,s] of Object.entries(this.draft.asset.animations) as [string,any][]){
   const b=btn('',()=>{this.state=key;this.row=0;this.frame=0;this.playing=false;this.render()},'ae-animation');b.classList.toggle('ae-selected',this.state===key)
   const c=document.createElement('canvas');c.width=52;c.height=52;this.thumb(c,pngURL(s.cells[0][0]),...this.draft.asset.frame as [number,number]);b.append(c,el('strong','',names[key]||key),el('small','',s.frames+' Frames · '+s.fps+' FPS'));this.tabs.append(b)
  }
  const s=this.current(),[fw,fh]=this.draft.asset.frame
  const direction=select(Array.from({length:s.cells.length},(_,i)=>[String(i),s.cells.length===4?['Süd','Nord','West','Ost'][i]:i===0?'Front':'Rücken']),String(this.row));direction.setAttribute('aria-label','Blickrichtung');direction.onchange=()=>{this.row=Number(direction.value);this.renderTimeline();void this.draw()}
  const zoom=select([1,2,4,8].map(n=>[String(n),n*100+' %']),String(this.zoom));zoom.setAttribute('aria-label','Sprite-Zoom');zoom.onchange=()=>{this.zoom=Number(zoom.value);void this.draw()}
  const bg=select([['checker','Transparenzraster'],['dark','Dunkler Hintergrund'],['light','Heller Hintergrund']],this.background);bg.onchange=()=>{this.background=bg.value;void this.draw()}
  const onion=input('','checkbox');onion.checked=this.onion;onion.onchange=()=>{this.onion=onion.checked;void this.draw()}
  const anchor=input('','checkbox');anchor.checked=this.anchor;anchor.onchange=()=>{this.anchor=anchor.checked;void this.draw()}
  this.buttons.append(btn(this.playing?'⏸ Pause':'▶ Abspielen',()=>{this.playing=!this.playing;this.started=performance.now();this.render();if(this.playing)this.tick()}),btn('← Frame',()=>this.step(-1)),btn('Frame →',()=>this.step(1)),direction,zoom,bg,label('Anker / Rahmen',anchor),label('Onion Skin',onion))
  this.canvas.setAttribute('aria-label','Animationsvorschau');this.comparison.setAttribute('aria-label','Vergleichsvorschau')
  const compare=select([['','Kein Vergleich'],...this.catalog.assets.filter((a:any)=>!a.definition.animations.stand.terrainGrid).map((a:any)=>[a.id,a.name] as [string,string])],this.comparisonId)
  compare.setAttribute('aria-label','Mit Asset vergleichen');compare.onchange=()=>{this.comparisonId=compare.value;void this.draw()}
  const box=el('div','ae-preview-box');box.append(this.canvas);this.stage.append(box)
  const compareBox=el('div','ae-preview-box');compareBox.append(this.comparison);this.stage.append(compareBox)
  this.comparison.hidden=!this.comparisonId
  const fps=input(s.fps,'number');fps.min='.1';fps.max='60';fps.step='.1';fps.setAttribute('aria-label','Animation FPS');fps.onchange=()=>{s.fps=Number(fps.value);s.frameDurations=Array(s.frames).fill(1000/s.fps);s.userEdited=true;this.changed();this.renderTimeline()}
  const duration=input(Math.round(s.frameDurations[this.frame]),'number');duration.min='16';duration.max='10000';duration.setAttribute('aria-label','Frame-Dauer in Millisekunden');duration.onchange=()=>{s.frameDurations[this.frame]=Number(duration.value);s.userEdited=true;this.changed()}
  const loop=input('','checkbox');loop.checked=s.loop!==false;loop.onchange=()=>{s.loop=loop.checked;this.changed()}
  this.details.append(el('h3','','Animation'),label('FPS (setzt alle Frame-Dauern)',fps),label('Dauer des ausgewählten Frames (ms)',duration),label('Vorschau wiederholen',loop),el('p','',`${fw} × ${fh} px pro Frame · ${s.frames} Frames · ${s.cells.length} Richtung(en)`))
  const sheetLink=el('a','','Grafikdatei öffnen') as HTMLAnchorElement;sheetLink.href=s.image?fileURL(s.image):'#';sheetLink.hidden=!s.image;sheetLink.target='_blank';sheetLink.rel='noopener';this.details.append(sheetLink,el('small','ae-path',s.image||'Noch nicht gespeichert'))
  this.details.append(btn('Frame duplizieren',()=>this.duplicateFrame()),btn('Frame entfernen',()=>this.deleteFrame()),btn('+ Animation',()=>this.addAnimation()))
  const required=this.required()
  if(!required.includes(this.state))this.details.append(btn('Animation entfernen',()=>this.deleteAnimation()))
  else this.details.append(el('small','','Pflichtanimation geschützt: '+this.state))
  this.renderMetadata();this.renderImport()
  const layout=el('div','ae-editor-layout'),main=el('div','ae-preview-column');main.append(this.buttons,label('Direkter Vergleich',compare),this.stage,this.timeline)
  layout.append(main,this.details);this.detail.append(title,scopeNotice,this.tabs,layout,this.usage)
  this.renderTimeline();void this.draw()
  if(!import.meta.env.DEV){for(const control of [...actions.querySelectorAll('button'),...this.details.querySelectorAll('input,select,button'),scope] as (HTMLInputElement|HTMLButtonElement|HTMLSelectElement)[])control.disabled=true;this.message('Schreibgeschützte Spielversion · Bearbeiten im lokalen Editor auf localhost:5173')}
 }
 private required(){const base=this.catalog.assets.find((a:any)=>a.id===(this.draft.asset.editorBaseId||this.id));return base?.protected?Object.keys(base.definition.animations):['stand',...(this.draft.asset.kind==='actor'?['walk']:[])]}
 private renderMetadata(){
  const a=this.draft.asset;this.details.append(el('h3','','Asset-Eigenschaften'))
  for(const [key,text] of [['name','Name'],['license','Lizenz / Herkunft']]){const i=input(this.draft[key]||'');i.onchange=()=>{this.draft[key]=i.value;this.changed()};this.details.append(label(text,i))}
  for(const [key,options] of [['category',categories],['biome',['Alle','Wald','Wüste','Schnee','Dschungel']]] as [string,string[]][]){const s=select(options.map(c=>[c,c]),this.draft[key]||options[0]);s.onchange=()=>{this.draft[key]=s.value;this.changed()};this.details.append(label(key==='category'?'Kategorie':'Biom',s))}
  for(const [key,text] of [['frame','Frame'],['foot','Fußanker'],['hitbox','Hitbox']] as [string,string][]){
   const pair=el('div','ae-pair');a[key].forEach((v:number,i:number)=>{const n=input(v,'number');n.setAttribute('aria-label',text+' '+(i?'Y / Höhe':'X / Breite'));if(key==='hitbox'&&this.draft.protected)n.disabled=true;n.onchange=()=>{a[key][i]=Number(n.value);this.changed();void this.draw()};pair.append(n)});this.details.append(label(text,pair))
  }
  this.details.append(el('h3','','Quellen / Abhängigkeiten'));for(const source of this.draft.sourceFiles||[])this.details.append(el('small','ae-path',(source.name||source.path)+' · '+source.format+(source.sha256?' · SHA256 '+source.sha256.slice(0,12):'')));for(const id of this.draft.dependencies||[])this.details.append(el('small','ae-path','Basis-Asset: '+id))
  const kind=select([['prop','Kartenobjekt'],['actor','Charakter / Gegner'],['effect','Effekt'],['terrain','Gelände-Tileset']],a.kind);kind.disabled=Boolean(this.draft.owned||this.draft.protected);kind.onchange=()=>{a.kind=kind.value;if(a.kind==='terrain'){a.terrainColumns||=1;a.frame=[64,64]}this.changed();this.render()};this.details.append(label('Asset-Art',kind))
  if(a.kind==='terrain'){const columns=input(a.terrainColumns||1,'number');columns.min='1';columns.max='128';columns.disabled=Boolean(this.draft.owned||this.draft.protected);columns.onchange=()=>{a.terrainColumns=Number(columns.value);this.changed()};this.details.append(label('Gelände-Spalten (Atlasimport)',columns))}
 }
 private renderImport(){
  const s=this.current();this.details.append(el('h3','','Bilder importieren'))
  const mode=select([['frame','Ausgewählten Frame ersetzen'],['append','Frames hinzufügen'],['animation','Animation ersetzen (GIF / Einzelbilder)'],['sheet','PNG-Sprite-Sheet ersetzen'],['asset','Gesamtes Asset ersetzen (alle Zustände)']],'frame')
  mode.setAttribute('aria-label','Import-Aktion')
  const files=input('','file');files.multiple=true;files.accept='.png,.jpg,.jpeg,.webp,.gif';files.setAttribute('aria-label','Grafiken hochladen')
  const rowCount=select([['1','Eine Richtung'],['2','Front / Rücken'],['4','Vier Richtungen']],String(s.cells.length));rowCount.setAttribute('aria-label','Sheet-Richtungen')
  files.onchange=()=>{if(files.files?.length)void this.importFiles([...files.files],mode.value,Number(rowCount.value))}
  this.details.append(mode,rowCount,files,el('p','ae-help','Dateien hierher ziehen oder auswählen. PNG, JPEG, WebP, GIF. Max. 12 MB/Datei, 256 Frames, 16 Mio. Pixel. Keine automatische Skalierung. Für Sheets gelten die oben eingestellten Frame-Abmessungen.'))
 }
 private renderTimeline(){
  this.timeline.replaceChildren();const s=this.current();if(!s)return
  s.cells[this.row].forEach((data:string,i:number)=>{
   const b=btn('',()=>{this.frame=i;this.playing=false;this.render()},'ae-frame');b.draggable=import.meta.env.DEV&&this.draft.asset.kind!=='terrain';b.dataset.frame=String(i);b.setAttribute('aria-label','Frame '+(i+1));b.classList.toggle('ae-selected',i===this.frame)
   const c=document.createElement('canvas');c.width=76;c.height=76;this.thumb(c,pngURL(data),...this.draft.asset.frame as [number,number]);b.append(c,el('span','',String(i+1)),el('small','',Math.round(s.frameDurations[i])+' ms'))
   b.ondragstart=e=>e.dataTransfer?.setData('application/x-nobby-frame',String(i));b.ondragover=e=>e.preventDefault();b.ondrop=e=>{e.preventDefault();if(e.dataTransfer?.files.length){e.stopPropagation();this.frame=i;void this.importFiles([...e.dataTransfer.files],'frame');return}if(this.draft.asset.kind==='terrain'||!import.meta.env.DEV)return;const raw=e.dataTransfer?.getData('application/x-nobby-frame');if(!raw)return;const from=Number(raw);if(!Number.isInteger(from)||from<0||from>=s.frames)return;for(const row of s.cells)row.splice(i,0,row.splice(from,1)[0]);s.frameDurations.splice(i,0,s.frameDurations.splice(from,1)[0]);s.userEdited=true;this.frame=i;this.changed();this.renderTimeline();void this.draw()}
   this.timeline.append(b)
  })
 }
 private step(delta:number){this.playing=false;this.frame=(this.frame+delta+this.current().frames)%this.current().frames;this.render()}
 private tick=()=>{
  if(!this.playing||!this.visible)return
  const s=this.current(),total=s.frameDurations.reduce((a:number,b:number)=>a+b,0),elapsed=performance.now()-this.started
  if(!s.loop&&elapsed>=total){this.frame=s.frames-1;this.playing=false;this.render();return}
  let time=elapsed%total,index=0;while(index<s.frames-1&&time>=s.frameDurations[index])time-=s.frameDurations[index++]
  if(this.frame===index&&this.comparisonId)void this.draw();
  if(this.frame!==index){this.frame=index;void this.draw();this.timeline.querySelectorAll('.ae-frame').forEach((b:any)=>b.classList.toggle('ae-selected',Number(b.dataset.frame)===index))}
  this.raf=requestAnimationFrame(this.tick)
 }
 private async draw(){
  const s=this.current();if(!s)return
  const sequence=++this.paintSequence,[fw,fh]=this.draft.asset.frame,img=await this.image(pngURL(s.cells[this.row][this.frame]))
  if(sequence!==this.paintSequence)return
  this.canvas.width=fw;this.canvas.height=fh;this.canvas.style.width=fw*this.zoom+'px';this.canvas.style.height=fh*this.zoom+'px'
  this.stage.dataset.background=this.background;this.comparison.hidden=!this.comparisonId
  const ctx=this.canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false
  if(this.onion&&this.frame){const prev=await this.image(pngURL(s.cells[this.row][this.frame-1]));if(sequence!==this.paintSequence)return;ctx.globalAlpha=.25;ctx.drawImage(prev,0,0);ctx.globalAlpha=1}
  ctx.drawImage(img,0,0)
  if(this.anchor){const [x,y]=this.draft.asset.foot;ctx.strokeStyle='#ffdf78';ctx.lineWidth=1;ctx.strokeRect(.5,.5,fw-1,fh-1);ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke()}
  if(this.comparisonId){
   const a=this.catalog.assets.find((a:any)=>a.id===this.comparisonId)?.definition;if(!a)return
   const other=a.animations[this.state]||a.animations.stand,p=await this.image(fileURL(other.image)),[w,h]=a.frame
   let f=this.frame%other.frames
   if(this.playing){let ms=(performance.now()-this.started)%((other.frameDurations||Array(other.frames).fill(1000/other.fps)).reduce((a:number,b:number)=>a+b,0)),i=0;const d=other.frameDurations||Array(other.frames).fill(1000/other.fps);while(i<other.frames-1&&ms>=d[i])ms-=d[i++];f=i}
   this.comparison.width=w;this.comparison.height=h;this.comparison.style.width=w*this.zoom+'px';this.comparison.style.height=h*this.zoom+'px';const c=this.comparison.getContext('2d')!;c.imageSmoothingEnabled=false;c.drawImage(p,f*w,Math.min(this.row,(other.rows||1)-1)*h,w,h,0,0,w,h)
  }
 }
 private duplicateFrame(){if(this.draft.asset.kind==='terrain'){this.message('Gelände-Kachelzahl bleibt zum Schutz bestehender Karten erhalten.');return}const s=this.current();for(const row of s.cells)row.splice(this.frame+1,0,row[this.frame]);s.frameDurations.splice(this.frame+1,0,s.frameDurations[this.frame]);s.frames++;s.userEdited=true;this.changed();this.render()}
 private deleteFrame(){const s=this.current();if(s.frames<=1||this.draft.asset.kind==='terrain'){this.message('Der letzte Frame bzw. bestehende Gelände-Kacheln können nicht entfernt werden.');return}if(!confirm('Frame '+(this.frame+1)+' aus dieser Animation entfernen?'))return;for(const row of s.cells)row.splice(this.frame,1);s.frameDurations.splice(this.frame,1);s.frames--;this.frame=Math.min(this.frame,s.frames-1);s.userEdited=true;this.changed();this.render()}
 private addAnimation(){if(this.draft.asset.kind==='terrain'){this.message('Gelände verwendet feste Kachelindizes.');return}const key=prompt('Animations-ID (z. B. cast, summon):','cast');if(!key)return;if(this.draft.asset.animations[key]){this.message('Animation existiert bereits');return}this.draft.asset.animations[key]=clone(this.current());this.draft.asset.animations[key].userEdited=true;this.state=key;this.frame=0;this.changed();this.render()}
 private deleteAnimation(){if(this.required().includes(this.state))return;if(!confirm('Animation '+this.state+' entfernen? Bilder bleiben in der Versionshistorie.'))return;delete this.draft.asset.animations[this.state];this.state='stand';this.frame=0;this.changed();this.render()}
 private async importFiles(files:File[],mode:string,rows?:number){
  if(!import.meta.env.DEV){this.message('Schreibgeschützte Spielversion. Import im lokalen Editor auf localhost:5173.');return}
  if(!this.draft){this.message('Zuerst ein Asset wählen oder anlegen.');return}
  try{
   if(files.length>256||files.some(f=>f.size>12*1024*1024)||files.reduce((n,f)=>n+f.size,0)>16*1024*1024)throw Error('Zu viele oder zu große Dateien. Maximal 12 MB je Datei und 16 MB insgesamt.');
   const originals=await Promise.all(files.map(encodeFile)),[fw,fh]=this.draft.asset.frame
   const imported=await this.client.request('assets/import',{files:originals,...(mode==='sheet'?{layout:{width:fw,height:fh,rows:rows||1,...(this.draft.asset.kind==='terrain'?{terrain:true,columns:this.draft.asset.terrainColumns}:{})}}:{})})
   let cells:string[][]=imported.cells
   if(imported.width!==fw||imported.height!==fh){
    if(imported.width>fw||imported.height>fh)throw Error(`Bild ${imported.width}×${imported.height} passt nicht in ${fw}×${fh}. Framegröße bewusst ändern oder Sprite-Sheet wählen.`)
    if(!confirm(`Bild ist ${imported.width}×${imported.height}. Ohne Skalierung in ${fw}×${fh} einpassen?`))return
    cells=await Promise.all(cells.map(async row=>Promise.all(row.map(async data=>{const c=document.createElement('canvas');c.width=fw;c.height=fh;const ctx=c.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.drawImage(await decode(pngURL(data)),Math.floor((fw-imported.width)/2),Math.max(0,Math.floor(this.draft.asset.foot[1]-imported.height)));return c.toDataURL().split(',')[1]}))))
   }
   const apply=(s:any)=>{
    if(mode==='asset'){s.cells=Array.from({length:cells.length>1?cells.length:s.cells.length},(_,r)=>[...cells[Math.min(r,cells.length-1)]]);s.frameDurations=[...imported.frameDurations]}
    else if(mode==='frame'){if(cells[0].length!==1)throw Error('Zum Ersetzen eines Frames genau ein Einzelbild wählen.');s.cells[this.row][this.frame]=cells[0][0]}
    else if(mode==='append'){for(let r=0;r<s.cells.length;r++)s.cells[r].push(...(r===this.row?cells[0]:Array(cells[0].length).fill(s.cells[r].at(-1))));s.frameDurations.push(...imported.frameDurations)}
    else if(cells.length>1){s.cells=clone(cells);s.frameDurations=[...imported.frameDurations]}
    else{const count=cells[0].length;s.cells=s.cells.map((row:string[],r:number)=>r===this.row?[...cells[0]]:Array.from({length:count},(_,i)=>row[i]||row.at(-1)));s.frameDurations=[...imported.frameDurations]}
    s.frames=s.cells[0].length;s.rows=s.cells.length;if(mode!=='frame')s.fps=Math.min(60,1000*s.frames/s.frameDurations.reduce((a:number,b:number)=>a+b,0));s.userEdited=true
   }
   if(mode==='asset'){if(!confirm('Alle Animationen dieses Assets durch die importierte Bildfolge ersetzen?'))return;for(const s of Object.values(this.draft.asset.animations))apply(s)}else apply(this.current())
   this.draft.imports=[...(this.draft.imports||[]),...originals];this.frame=Math.min(this.frame,this.current().frames-1);this.row=Math.min(this.row,this.current().cells.length-1);this.changed();this.render();this.message('Importiert · Vorschau aktualisiert · noch nicht gespeichert. Andere Richtungen behalten vorhandene Bilder, falls nur eine Richtung importiert wurde.')
  }catch(e){this.message('Import fehlgeschlagen: '+String(e))}
 }
 private create(){
  if(this.dirty&&!confirm('Entwurf ist lokal gesichert. Neues Asset anlegen?'))return
  const id=prompt('Neue Asset-ID:','user-'+Date.now());if(!id)return
  this.id=id;this.pending=null;this.scope='global';this.draft={id,name:id,category:'Dekoration',biome:'Alle',license:'Eigene Grafik',protected:false,owned:false,asset:{kind:'prop',frame:[64,64],foot:[32,64],hitbox:[32,24],solid:false,directional:false,animations:{stand:{frames:1,rows:1,fps:1,frameDurations:[1000],loop:true,cells:[[blank(64,64)]],userEdited:true}}}}
  this.state='stand';this.row=0;this.frame=0;this.changed();this.render()
 }
 private duplicate(){
  if(!this.draft)return
  const id=prompt('ID des unabhängigen Duplikats:',this.id+'-kopie');if(!id||this.catalog.assets.some((a:any)=>a.id===id)){this.message('Bitte eine freie Asset-ID wählen.');return}
  this.pending=null;this.draft=clone(this.draft);this.draft.asset.editorBaseId=this.draft.asset.editorBaseId||(this.catalog.assets.some((a:any)=>a.id===this.id)?this.id:undefined);this.id=id;this.draft.id=id;this.draft.name+=' · Kopie';this.draft.owned=false;this.draft.protected=false;this.scope='global';this.changed();this.render()
 }
 async save(){
  if(this.saving||!this.draft)return
  if(!this.client.writable){this.message('Schreibgeschützt: nur die lokale Mac-Vorschau kann speichern.');return}
  if(!this.dirty){this.message('Gespeichert · keine Änderungen.');return}
  if(this.scope==='global'&&this.draft.protected&&!this.pending&&!confirm('Diese Änderungen gelten für ALLE Instanzen von '+this.id+'. Als eigene Bearbeitung speichern? Originaldateien bleiben erhalten.'))return
  if(this.scope==='variant'&&!this.pending){
   const id=prompt('Eigene ID für dieses Kartenobjekt:',this.id+'-variante');if(!id)return
   if(this.catalog.assets.some((a:any)=>a.id===id)){this.message('Objektvariante benötigt eine neue, freie Asset-ID.');return}
   this.draft.asset.editorBaseId=this.draft.asset.editorBaseId||this.id;this.id=id;this.draft.id=id;this.draft.protected=false;this.draft.owned=false
  }
  const pending=this.pending??={payload:{id:this.id,draft:clone(this.draft),baseRevision:this.catalog.revision,operationId:crypto.randomUUID()},version:this.version,scope:this.scope}
  this.saving=true;let committed=false;void writeDraft('asset:last',{draft:this.draft,id:this.id,scope:this.scope,version:this.version,pending});this.request=new AbortController();this.message('Wird gespeichert · Bilder prüfen, Backup und Registry-Transaktion …')
  try{
   const response=await this.client.request('assets/save',pending.payload,{signal:this.request.signal})
   committed=true;this.pending=null;this.dirty=this.version!==pending.version;this.draft.owned=true;this.catalog.revision=response.revision
   if(!this.dirty){this.draft.imports=[];void writeDraft('asset:'+this.id,null);void writeDraft('asset:last',null)}
   if(pending.scope==='variant'){this.hooks.variant(response.id);this.scope='global'}
   await this.reload();await this.hooks.changed(this.catalog)
   this.message(this.dirty?'Gespeichert · weitere Änderungen sind noch ungespeichert.':'Gespeichert, Spiel muss aktualisiert werden · Kartenansicht ist aktuell.')
  }catch(error:any){if(error.status>=400&&error.status<500)this.pending=null;this.message((committed?'Gespeichert, Vorschau-Aktualisierung fehlgeschlagen':error.status===409?'Externer Bearbeitungskonflikt':'Speichern fehlgeschlagen')+' · '+error.message+' · Entwurf bleibt erhalten. Erneut „Asset speichern“ oder als Duplikat retten.')}
  finally{this.saving=false;this.request=null;this.hooks.dirty()}
 }
 private async showUsage(){try{const result=await this.client.request('usage',{id:this.id});this.usage.replaceChildren(el('h3','','Verwendungen / Abhängigkeiten'));for(const u of result.usage)this.usage.append(el('p','',u.file?u.file+' · '+(u.name||'')+' · Objekt '+(u.objectId||'–'):u.name));if(!result.usage.length)this.usage.append(el('p','','Keine Kartenreferenzen gefunden.'))}catch(e){this.message(String(e))}}
 private async removeAsset(){
  await this.showUsage();if(!confirm(this.draft.protected?'Eigene Änderungen zurücksetzen? Die Basisgrafik wird wieder aktiv.':'Eigenes Asset in den Papierkorb verschieben? Verwendete Assets werden blockiert.'))return
  try{await this.client.request('assets/delete',{id:this.id,baseRevision:this.catalog.revision,operationId:crypto.randomUUID(),reset:this.draft.protected});this.dirty=false;await this.reload();await this.hooks.changed(this.catalog);this.detail.replaceChildren();this.draft=null;this.message('Im Papierkorb · Wiederherstellen möglich. Spiel muss aktualisiert werden.')}catch(e){this.message(String(e))}
 }
 private async trash(){if(this.dirty&&!confirm('Entwurf bleibt lokal gesichert. Papierkorb öffnen?'))return;await this.reload();this.detail.replaceChildren(el('h2','','Papierkorb'));for(const e of this.catalog.trash){const row=el('div','ae-trash');row.append(el('span','',e.name+' · '+e.id+' · '+e.deletedAt),btn('Wiederherstellen',()=>void this.restore(e.key)));this.detail.append(row)}if(!this.catalog.trash.length)this.detail.append(el('p','','Papierkorb ist leer.'))}
 private async restore(key:string){try{const result=await this.client.request('assets/restore',{key,baseRevision:this.catalog.revision,operationId:crypto.randomUUID()});await this.reload();await this.hooks.changed(this.catalog);await this.choose(result.id);this.message('Wiederhergestellt · Spiel muss aktualisiert werden.')}catch(e){this.message(String(e))}}
 private exportDraft(){if(!this.draft)return;const u=URL.createObjectURL(new Blob([JSON.stringify(this.draft,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=this.id+'-entwurf.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
 destroy(){cancelAnimationFrame(this.raf);this.request?.abort()}
}
