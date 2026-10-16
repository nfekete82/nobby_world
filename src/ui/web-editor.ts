import initialArt from '../art/registry.json'
import {AssetEditor} from './asset-editor'
import {EditorClient,SaveSnapshot,readDraft,writeDraft} from './editor-client.mjs'
const art:any=structuredClone(initialArt)
import './web-editor.css'
import {expandLayerGrid,expansionFill,validateMapExpansion} from './map-resize.mjs'
import {walkabilityChanges,repairPaintedWalkways} from './terrain-rules.mjs'
import {OBJECT_CATEGORIES,TILE_CATEGORIES,layerLabel,layerHelp,objectCategory,tilesetCategory,layerForTileCategory,layerForTileset,BIOMES,BIOME_TILE_CATEGORIES,BIOME_OBJECT_CATEGORIES,objectBiome,tilesetBiome,visibleInBiome} from './editor-taxonomy.mjs'

type Sheet={first:number,count:number,cols:number,img:HTMLImageElement,source:string,title:string}
type PaintLayer={node:Element,name:string,gids:number[]}
type EditObject={node:Element,x:number,y:number,w:number,h:number,asset:string,kind:string}
const base=import.meta.env.BASE_URL
const pathUrl=(name:string)=>base+name.split('/').map(encodeURIComponent).join('/')
const readXml=(text:string)=>{
 const doc=new DOMParser().parseFromString(text,'application/xml')
 if(doc.querySelector('parsererror'))throw Error('Ungültiges XML')
 return doc
}
const props=(el:Element)=>Array.from(el.querySelectorAll(':scope > properties > property'))
const prop=(el:Element,name:string)=>props(el).find(p=>p.getAttribute('name')===name)?.getAttribute('value')??''
const setProp=(el:Element,name:string,value:string,kind='string')=>{
 let container=el.querySelector(':scope > properties')
 if(!container){container=el.ownerDocument.createElement('properties');el.append(container)}
 let p=props(el).find(e=>e.getAttribute('name')===name)
 if(!p){p=el.ownerDocument.createElement('property');p.setAttribute('name',name);container.append(p)}
 p.setAttribute('value',value)
 p.setAttribute('type',kind)
}
const getObj=(el:Element):EditObject=>{
 const kind=el.getAttribute('class')||'prop'
 const asset=kind==='prop'?prop(el,'asset'):kind==='npc'?(prop(el,'asset')||'female'):kind==='monster'?(prop(el,'asset')||enemyGraphic(prop(el,'enemy'))):'portal-marker'
 return {node:el,x:Number(el.getAttribute('x')||0),y:Number(el.getAttribute('y')||0),
  w:Number(el.getAttribute('width')||32),h:Number(el.getAttribute('height')||24),asset,kind}
}
const elt=<T extends HTMLElement>(tag:string,cls='',value=''):T=>{
 const e=document.createElement(tag) as T;e.className=cls
 if(value)e.textContent=value
 return e
}
const button=(label:string,handler:()=>void,cls='')=>{
 const el=elt<HTMLButtonElement>('button',cls,label);el.type='button';el.addEventListener('click',handler);return el
}
const field=(label:string,input:HTMLElement)=>{
 const row=elt<HTMLLabelElement>('label','we-field');row.append(elt('span','',label),input);return row
}
const image=(src:string)=>new Promise<HTMLImageElement>((resolve)=>{
 const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>resolve(i);i.src=src
})
const asNumber=(value:string,fallback:number)=>Number.isFinite(Number(value))?Number(value):fallback

class MapEditor {
 private root=elt<HTMLElement>('section','we-overlay')
 private canvas=elt<HTMLCanvasElement>('canvas','we-map')
 private palette=elt<HTMLElement>('div','we-palette')
 private detail=elt<HTMLElement>('div','we-detail')
 private message=elt<HTMLElement>('p','we-message')
 private tool='select'
 private sheet:Sheet[]=[]
 private layer:PaintLayer[]=[]
 private document!:Document
 private source=''
 private id=''
 private w=0
 private h=0
 private zoom=.55
 private offsetX=0
 private offsetY=0
 private layerIndex=2
 private activeCategory='Alle'
 private biome='Wald'
 private autoWalkable=true
 private biomeTabs=elt<HTMLElement>('div','we-biomes')
 private pendingRefresh=false
 private saving=false
 private client=new EditorClient(base)
 private saveSession=new SaveSnapshot()
 private saveController:AbortController|null=null
 private future:string[]=[]
 private assetEditor!:AssetEditor
 private mapPane:HTMLElement|null=null
 private mapToolbar:HTMLElement|null=null
 private selectedPlayer=false
 private draftTimer:any=null
 private beforeUnload=(e:BeforeUnloadEvent)=>{if(this.dirty||this.assetEditor?.dirty||this.saving||this.assetEditor?.saving){e.preventDefault();e.returnValue=''}}
 private chosenGid=2
 private chosenAsset='tree-oak'
 private selected:Element|null=null
 private history:string[]=[]
 private dragging=false
 private panning=false
 private prev:{x:number,y:number}|null=null
 private paintLast=-1
 private dirty=false
 private spriteCache=new Map<string,HTMLImageElement>()
 private picker=elt<HTMLSelectElement>('select')
 private objectArea=elt<HTMLElement>('section','we-object-area')
 private gallery=elt<HTMLElement>('div','we-object-gallery')
 private objectSearch=elt<HTMLInputElement>('input','we-search')
 private resizePanel=elt<HTMLElement>('section','we-resize-panel')
 private resizeWidth=elt<HTMLInputElement>('input')
 private resizeHeight=elt<HTMLInputElement>('input')
 private zoomText=elt<HTMLElement>('span','we-zoom-status','100 %')
 private layerPicker=elt<HTMLSelectElement>('select')
 private layerHelpText=elt<HTMLElement>('div','we-layer-help')
 private layerField=field('Kachelebene',this.layerPicker)
 private categoryTabs=elt<HTMLElement>('div','we-categories')
 private paletteTabs=elt<HTMLElement>('div','we-tabs')
 private viewport=elt<HTMLElement>('div','we-viewport')
 private stage=elt<HTMLElement>('div','we-stage')
 private staticNotice=elt<HTMLElement>('div','we-static-notice',
  import.meta.env.DEV
   ? 'Live-Editor aktiv (localhost:5173): Änderungen werden direkt in die TMX-Projektdateien gespeichert.'
   : 'Fertige Spielversion: direkte Kartenbearbeitung nicht verfügbar. Bitte TMX exportieren oder den OrbStack-Editor auf localhost:5173 öffnen.')
 constructor(private engine:any){
  this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true')
  this.root.setAttribute('aria-label','Nobby World Karteneditor')
  const header=elt<HTMLElement>('header','we-header')
  header.append(elt('h2','','🗺 Nobby World · Karteneditor'),
   button('↶ Rückgängig',()=>this.undo()),
   button('↷ Wiederholen',()=>this.redo()),
   button('🎨 Grafiken & Animationen',()=>void this.openAssets()),
   button('↓ TMX exportieren',()=>this.export()),
   button('💾 Speichern',()=>void this.saveActive(),'we-primary'),
   button('Speichern abbrechen',()=>this.saveController?.abort()),
   button('Spiel aktualisieren',()=>void this.refreshAfterClose()),
   button('✕ Schließen',()=>this.close()))
  const toolbar=elt<HTMLElement>('div','we-toolbar')
  for(const [id,label] of [['select','↖ Objekte'],['object','🌲 Platzieren'],['tile','🖌 Kacheln'],['erase','⌫ Löschen']]){
   const el=button(label,()=>this.setTool(id));el.dataset.tool=id;toolbar.append(el)
  }
  this.layerPicker.addEventListener('change',()=>{this.layerIndex=Number(this.layerPicker.value);this.updateLayerHelp();this.redraw()})
  toolbar.append(this.layerField,
   button('−',()=>this.zoomAt(.8),'we-zoom-button'),
   this.zoomText,button('+',()=>this.zoomAt(1.25),'we-zoom-button'),
   button('⤢ Einpassen',()=>this.fitMap()),
   button('▣ Karte erweitern',()=>this.toggleMapSize(),'we-resize-toggle'),this.layerHelpText)
  const walkCheck=elt<HTMLInputElement>('input');walkCheck.type='checkbox';walkCheck.checked=true
  walkCheck.addEventListener('change',()=>this.autoWalkable=walkCheck.checked)
  const walkLabel=elt<HTMLLabelElement>('label','we-walkable')
  walkLabel.append(walkCheck,elt('span','','Beim Malen Boden/Wege begehbar machen'))
  const walkRepair=button('🧭 Vorhandene Wege entsperren',()=>this.repairWalkways(),'we-repair')
  const pane=elt('main','we-body')
  this.stage.append(this.canvas);this.viewport.append(this.stage)
  const sidebar=elt('aside','we-sidebar')
  const toolHelp=elt('p','we-help','Gelände, Wüste, Felsboden und Schnee besitzen eigene Kachelebenen. Wege und Brücken können darüber liegen. ⌫ Löschen entfernt nur die gewählte Ebene. Für neues Land rote Sperrflächen separat entfernen.')
  this.picker.addEventListener('change',()=>{
   this.chosenAsset=this.picker.value;this.refreshGallerySelection()
  })
  this.objectSearch.type='search'
  this.objectSearch.placeholder='🔍 Objekte suchen …'
  this.objectSearch.setAttribute('aria-label','Objekte suchen')
  this.objectSearch.addEventListener('input',()=>this.filterGallery())
  this.gallery.setAttribute('aria-label','Objektvorschau')
  this.objectArea.append(field('Objekt für Platzieren',this.picker),
   field('Objekte mit Bildvorschau',this.objectSearch),this.gallery)
  this.resizeWidth.type='number';this.resizeHeight.type='number'
  this.resizeWidth.min='1';this.resizeHeight.min='1'
  this.resizeWidth.max='128';this.resizeHeight.max='128'
  this.resizeWidth.step='1';this.resizeHeight.step='1'
  this.resizePanel.hidden=true
  this.resizePanel.append(elt('h3','','Kartenfläche erweitern'),
   elt('p','we-help','Bestehende Insel bleibt erhalten. Zusätzliche Fläche entsteht rechts und unten zunächst als gesperrtes Wasser.'),
   field('Breite in Kacheln',this.resizeWidth),
   field('Höhe in Kacheln',this.resizeHeight),
   button('Fläche erweitern',()=>this.expandMap(),'we-primary'))
  sidebar.append(this.resizePanel,this.biomeTabs,this.categoryTabs,this.objectArea,this.detail,this.paletteTabs,this.palette,walkLabel,walkRepair,toolHelp,this.staticNotice)
  pane.append(this.viewport,sidebar)
  this.message.setAttribute('role','status')
  const footer=elt('footer','we-footer')
  footer.append(this.message,elt('span','','Esc: Schließen · ⌘S: Speichern · Rechtsklick: Karte verschieben'))
  this.mapPane=pane;this.mapToolbar=toolbar
  this.assetEditor=new AssetEditor(this.client,{
   back:()=>{pane.hidden=false;toolbar.hidden=false},
   context:()=>this.selected&&['prop','npc','monster'].includes(this.selected.getAttribute('class')||'')?this.selected.getAttribute('id'):null,
   variant:id=>{if(!this.selected)return;this.saveHistory();setProp(this.selected,'asset',id);this.dirty=true;this.updateDetails();this.redraw();this.status('Objektvariante zugewiesen · Karte separat speichern.')},
   changed:async catalog=>{this.pendingRefresh=true;art.assets=Object.fromEntries(catalog.assets.map((a:any)=>[a.id,a.definition]));this.spriteCache.clear();await this.preloadSprites();await this.loadUserTilesets(catalog);this.buildPalettes();this.updateDetails();this.redraw();this.status('Grafiken gespeichert, Spiel muss aktualisiert werden. Kartenansicht ist aktuell.')},
   dirty:()=>this.root.dataset.dirty=String(this.dirty||this.assetEditor.dirty)
  })
  this.root.append(header,toolbar,pane,this.assetEditor.root,footer)
  window.addEventListener('beforeunload',this.beforeUnload)
  if(import.meta.env.DEV)void this.client.start().then(()=>this.staticNotice.textContent=this.client.writable?'Lokaler Editor aktiv · Backups und Versionsprüfung vor jedem Speichern.':'Schreibgeschützte Umgebung · Vorschau und Export möglich.').catch(()=>this.staticNotice.textContent='Keine lokale Schreibverbindung. Entwurf kann exportiert werden.')
  this.root.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.close()}
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();e.stopPropagation();void this.saveActive()}
   if(!this.assetEditor.visible&&(e.key==='Delete'||e.key==='Backspace')&&this.selected&&!(e.target instanceof HTMLInputElement)){
    e.preventDefault();this.removeSelected()
   }
  },true)
  window.addEventListener('keydown',this.globalKey,true)
  this.viewport.addEventListener('contextmenu',e=>e.preventDefault())
  this.viewport.addEventListener('wheel',e=>this.wheel(e),{passive:false})
  this.canvas.addEventListener('pointerdown',e=>this.startPointer(e))
  this.canvas.addEventListener('pointermove',e=>this.movePointer(e))
  this.canvas.addEventListener('pointerup',()=>this.endPointer())
  this.canvas.addEventListener('pointercancel',()=>this.endPointer())
  this.canvas.addEventListener('lostpointercapture',()=>this.endPointer())
  this.renderBiomes()
  this.setTool('select')
  document.body.append(this.root)
  void this.load()
 }
 private globalKey=(e:KeyboardEvent)=>{
  if(e.key==='Escape'||(e.metaKey&&e.key.toLowerCase()==='s')||(e.ctrlKey&&e.key.toLowerCase()==='s')){
   e.preventDefault();e.stopImmediatePropagation()
   if(e.key==='Escape')this.close();else void this.saveActive()
  }
 }
 private status(text:string){this.message.textContent=text}
 private setTool(tool:string){
  if((tool==='tile'||tool==='erase')!==(this.tool==='tile'||this.tool==='erase'))this.activeCategory='Alle'
  this.tool=tool
  this.root.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(b=>b.classList.toggle('we-active',b.dataset.tool===tool))
  this.palette.hidden=tool!=='tile';this.paletteTabs.hidden=tool!=='tile'
  this.objectArea.hidden=tool!=='select'&&tool!=='object'
  this.detail.hidden=tool!=='select'
  this.layerField.hidden=tool!=='tile'&&tool!=='erase'
  this.layerHelpText.hidden=tool!=='tile'&&tool!=='erase'
  this.renderCategories();this.filterGallery();this.filterTilesets();this.redraw()
 }
 private renderBiomes(){
  this.biomeTabs.replaceChildren(elt('strong','','Gegend wählen'))
  for(const name of BIOMES){
   const control=button(name,()=>{
    this.biome=name;this.activeCategory='Alle'
    this.renderBiomes();this.renderCategories();this.filterGallery();this.filterTilesets()
    this.status('Biom: '+name+' · Flächen und Objekte passend zur Gegend.')
   },'we-biome')
   control.classList.toggle('we-active',this.biome===name)
   control.setAttribute('aria-pressed',String(this.biome===name))
   this.biomeTabs.append(control)
  }
 }
 private renderCategories(){
  this.categoryTabs.replaceChildren()
  const tileMode=this.tool==='tile'||this.tool==='erase'
  this.categoryTabs.append(elt('strong','we-category-title',tileMode?'Kacheln nach Bereich':'Objekte nach Kategorie'))
  const choices=tileMode?BIOME_TILE_CATEGORIES[this.biome as keyof typeof BIOME_TILE_CATEGORIES]:BIOME_OBJECT_CATEGORIES[this.biome as keyof typeof BIOME_OBJECT_CATEGORIES]
  for(const name of choices){
   const choice=button(name,()=>{
    this.activeCategory=name
    if(tileMode){
     const preferred=layerForTileCategory(name)
     const index=this.layer.findIndex(layer=>layer.name===preferred)
     if(index>=0){this.layerIndex=index;this.layerPicker.value=String(index);this.updateLayerHelp()}
    }
    this.renderCategories();this.filterGallery();this.filterTilesets();this.redraw()
   },'we-category')
   choice.classList.toggle('we-active',this.activeCategory===name)
   choice.setAttribute('aria-pressed',String(this.activeCategory===name))
   this.categoryTabs.append(choice)
  }
 }
 private updateLayerHelp(){
  const layer=this.layer[this.layerIndex]
  this.layerHelpText.textContent=layer?layerHelp(layer.name):'Wähle eine Ebene, um ihre Funktion zu sehen.'
 }
 private filterTilesets(){
  if((this.tool!=='tile'&&this.tool!=='erase')||!this.sheet.length)return
  let first=-1
  this.paletteTabs.querySelectorAll<HTMLButtonElement>('button').forEach((b,index)=>{
   const visible=visibleInBiome(tilesetBiome(this.sheet[index].source),this.biome)&&
     (this.activeCategory==='Alle'||tilesetCategory(this.sheet[index].source)===this.activeCategory)
   b.hidden=!visible
   if(visible&&first<0)first=index
  })
  const current=this.sheet.findIndex(s=>this.chosenGid>=s.first&&this.chosenGid<s.first+s.count)
  if(first>=0&&(current<0||!visibleInBiome(tilesetBiome(this.sheet[current].source),this.biome)||
   (this.activeCategory!=='Alle'&&tilesetCategory(this.sheet[current].source)!==this.activeCategory))){
   let index=first
   // Selecting a biome should open its landscape, not generic background water.
   if(this.activeCategory==='Alle'){
    const preferred=this.biome==='Wüste'?'desert.tsx':this.biome==='Schnee'?'snow.tsx':this.biome==='Dschungel'?'jungle.tsx':'grass.tsx'
    const found=this.sheet.findIndex(s=>s.source===preferred)
    if(found>=0)index=found
   }
   // Prefer blue background water over the collision-only water tile.
   if(this.activeCategory==='Wasser'){
    const water=this.sheet.findIndex(s=>s.source==='water-background.tsx')
    if(water>=0)index=water
   }
   this.chosenGid=this.sheet[index].first
   this.showSheet(index)
  }
 }
 private async load(){
  this.root.setAttribute('aria-busy','true');this.mapPane.inert=true;this.mapToolbar.inert=true
  try{
   const live=String(this.engine?.sceneMap?.data?.()?.id||'simplemap').replace(/^map-/,'')
   this.id=/^[a-zA-Z0-9_-]+$/.test(live)?live:'simplemap'
   this.status('Karte wird geladen …')
   const url=pathUrl('map/'+this.id+'.tmx') // Tiled Vite middleware resolves literal filenames; cache handled by fetch()
   const reply=await fetch(url,{cache:'no-store'})
   if(!reply.ok)throw Error('Karte konnte nicht geladen werden ('+reply.status+')')
   this.source=await reply.text();this.document=readXml(this.source)
   const map=this.document.documentElement
   this.w=Number(map.getAttribute('width'))*64
   this.h=Number(map.getAttribute('height'))*64
   if(!this.w||!this.h||this.w>8192||this.h>8192)throw Error('Kartengröße wird nicht unterstützt')
   this.canvas.width=this.w;this.canvas.height=this.h
   this.resizeWidth.value=String(this.w/64);this.resizeHeight.value=String(this.h/64)
   const references=Array.from(map.querySelectorAll(':scope > tileset'))
   this.sheet=await Promise.all(references.map(async ref=>{
    const source=ref.getAttribute('source')||''
    const tsxUrl=pathUrl('map/'+source)
    const response=await fetch(tsxUrl);if(!response.ok)throw Error(source+' nicht gefunden')
    const tsx=readXml(await response.text()).documentElement
    const imgElement=tsx.querySelector('image')
    const img=await image(new URL(imgElement?.getAttribute('source')||'',new URL(tsxUrl,location.href)).href)
    return {first:Number(ref.getAttribute('firstgid')),count:Number(tsx.getAttribute('tilecount')),
     cols:Number(tsx.getAttribute('columns')),img,source,title:tsx.getAttribute('name')||source}
   }))
   await this.loadExtraPathTilesets(map)
   this.parseLayers()
   const recovery:any=await readDraft('map:'+this.id)
   if(recovery?.updated&&confirm('Lokalen ungespeicherten Kartenentwurf wiederherstellen?')){
    this.document=readXml(recovery.updated);const m=this.document.documentElement
    this.w=Number(m.getAttribute('width'))*64;this.h=Number(m.getAttribute('height'))*64;this.canvas.width=this.w;this.canvas.height=this.h;this.parseLayers();this.dirty=true;this.saveSession.pending=recovery.pending||null
   }
   await this.preloadSprites()
   this.buildPalettes()
   this.fitMap()
   this.redraw()
   this.root.dataset.ready='true'
   this.status(this.id+' · '+this.w/64+' × '+this.h/64+' Kacheln · 64 px Raster')
  }catch(error){this.status('Fehler: '+String(error));this.root.querySelectorAll('button').forEach(b=>{if(b.textContent?.includes('Speichern'))b.disabled=true})}
  finally{this.root.setAttribute('aria-busy','false');this.mapPane.inert=false;this.mapToolbar.inert=false}
 }
 private async loadExtraPathTilesets(map:Element){
  // No on-disk TMX migration: older 100x40 user maps remain untouched until
  // they explicitly paint and save. Tiled refs are added only in editor memory.
  let gid=Math.max(1,...this.sheet.map(s=>s.first+s.count))
  for(const source of ['desert-path.tsx','snow-path.tsx','jungle.tsx']){
   if(this.sheet.some(sheet=>sheet.source===source))continue
   const url=pathUrl('map/'+source)
   const response=await fetch(url)
   if(!response.ok)throw Error('Biom-Übergang fehlt: '+source)
   const definition=readXml(await response.text()).documentElement
   const imgName=definition.querySelector('image')?.getAttribute('source')||''
   const img=await image(new URL(imgName,new URL(url,location.href)).href)
   if(!img.naturalWidth)throw Error('Biom-Übergang Grafik fehlt: '+source)
   const count=Number(definition.getAttribute('tilecount'))
   const cols=Number(definition.getAttribute('columns'))
   if(!Number.isInteger(count)||count<1||!Number.isInteger(cols)||cols<1)
    throw Error('Biom-Tileset beschädigt: '+source)
   const ref=this.document.createElement('tileset')
   ref.setAttribute('firstgid',String(gid));ref.setAttribute('source',source)
   map.insertBefore(ref,map.querySelector(':scope > layer'))
   this.sheet.push({first:gid,count,cols,img,source,title:definition.getAttribute('name')||source})
   gid+=count
  }
  if(!map.querySelector(':scope > layer[name="Dschungel"]')){
   const layer=this.document.createElement('layer'),data=this.document.createElement('data')
   const next=Number(map.getAttribute('nextlayerid'))||100
   layer.setAttribute('id',String(next));map.setAttribute('nextlayerid',String(next+1))
   layer.setAttribute('name','Dschungel');layer.setAttribute('width',String(this.w/64));layer.setAttribute('height',String(this.h/64))
   data.setAttribute('encoding','csv');data.textContent=Array(this.w*this.h/4096).fill(0).join(',')
   layer.append(data);map.insertBefore(layer,map.querySelector(':scope > layer[name="Wege"]'))
  }
 }
 private parseLayers(){
  this.layer=Array.from(this.document.querySelectorAll('map > layer')).map(node=>{
   const gids=(node.querySelector('data')?.textContent||'').trim().split(/\s*,\s*/).map(Number)
   if(gids.length!==(this.w/64)*(this.h/64))throw Error('Ungültige Kachelebene '+node.getAttribute('name'))
   return {node,name:node.getAttribute('name')||'Ebene',gids}
  })
  this.layerPicker.replaceChildren()
  this.layer.forEach((l,n)=>{
   const o=elt<HTMLOptionElement>('option','',layerLabel(l.name));o.value=String(n);this.layerPicker.append(o)
  })
  this.layerIndex=Math.min(this.layerIndex,this.layer.length-1)
  this.layerPicker.value=String(this.layerIndex)
  this.updateLayerHelp()
 }
 private async preloadSprites(){
  const images=new Set<string>()
  for(const object of this.objects()){
   const asset=(art.assets as any)[object.asset]
   const name=asset?.animations?.stand?.image
   if(name)images.add(name)
  }
  const player=this.playerGraphic();const hero=art.assets[player]?.animations.stand.image;if(hero)images.add(hero)
  await Promise.all([...images].map(async name=>this.spriteCache.set(name,await image(pathUrl(name)))))
 }
 private buildPalettes(){
  this.paletteTabs.replaceChildren()
  this.picker.replaceChildren()
  for(const [id,a] of Object.entries(art.assets)){
   if(a.kind!=='prop')continue
   const o=elt<HTMLOptionElement>('option','',id);o.value=id;this.picker.append(o)
  }
  for(const [value,label] of [['npc:mira','NPC · Mira'],['monster:ritter','Gegner · Ritter'],
   ['monster:berserker','Gegner · Berserker'],...Object.entries(ENEMIES).filter(([id])=>!['ritter','berserker'].includes(id)).map(([id,spec])=>['monster:'+id,'Gegner · '+spec.name]),['portal:map','Kartenportal']]){
   const option=elt<HTMLOptionElement>('option','',label);option.value=value;this.picker.append(option)
  }
  this.picker.value=this.chosenAsset
  this.sheet.forEach((sheet,idx)=>{
   this.paletteTabs.append(button(sheet.title,()=>this.showSheet(idx)))
  })
  this.showSheet(this.sheet.findIndex(s=>this.chosenGid>=s.first&&this.chosenGid<s.first+s.count))
  this.buildGallery()
  this.renderCategories()
  this.filterTilesets()
 }

 private objectEntries(){
  const props=Object.entries(art.assets)
   .filter(([_,a])=>a.kind==='prop')
   .map(([id,a])=>({id,label:id.replaceAll('-',' '),asset:a,group:objectCategory(id),biome:objectBiome(id)}))
  const actors=[
   {id:'npc:mira',label:'Mira (NPC)',asset:art.assets.female,group:'NPCs',biome:'Alle'},
   {id:'monster:ritter',label:'Ritter (Gegner)',asset:art.assets['enemy-warrior'],group:'Gegner',biome:'Alle'},
   {id:'monster:berserker',label:'Berserker (Gegner)',asset:art.assets['enemy-berserker'],group:'Gegner',biome:'Alle'},
   ...Object.entries(ENEMIES).filter(([id])=>!['ritter','berserker'].includes(id)).map(([id,spec])=>({id:'monster:'+id,label:spec.name+' (Gegner)',asset:(art.assets as any)[spec.graphic],group:'Gegner',biome:spec.biome})),
   {id:'portal:map',label:'Kartenportal',asset:art.assets['portal-marker'],group:'Portale',biome:'Alle'}
  ]
  return [...props,...actors].sort((a,b)=>OBJECT_CATEGORIES.indexOf(a.group)-OBJECT_CATEGORIES.indexOf(b.group))
 }
 private buildGallery(){
  this.gallery.replaceChildren()
  let group=''
  for(const entry of this.objectEntries()){
   if(group!==entry.group){
    group=entry.group
    this.gallery.append(elt('h4','we-object-group',group))
   }
   const b=elt<HTMLButtonElement>('button','we-object-card')
   b.type='button';b.dataset.asset=entry.id;b.dataset.category=entry.group;b.dataset.biome=entry.biome
   b.title=entry.label+' platzieren'
   const thumb=elt<HTMLCanvasElement>('canvas','we-object-thumb')
   thumb.width=92;thumb.height=78
   b.append(thumb,elt('span','',entry.label))
   b.addEventListener('click',()=>{
    this.chosenAsset=entry.id;this.picker.value=entry.id
    this.refreshGallerySelection();this.setTool('object')
    this.status(entry.label+' ausgewählt · Mehrfachplatzierung aktiv – zum Beenden »Objekte« wählen.')
   })
   this.gallery.append(b)
   const asset=entry.asset as any
   const src=asset?.animations?.stand?.image
   if(!src)continue
   const draw=(img:HTMLImageElement)=>{
    if(!img.naturalWidth)return
    const ctx=thumb.getContext('2d');if(!ctx)return
    ctx.clearRect(0,0,thumb.width,thumb.height);ctx.imageSmoothingEnabled=false
    const [fw,fh]=asset.frame
    const ratio=Math.min(84/fw,72/fh)
    const dw=fw*ratio,dh=fh*ratio
    ctx.drawImage(img,0,0,fw,fh,(92-dw)/2,(78-dh)/2,dw,dh)
   }
   const cached=this.spriteCache.get(src)
   if(cached)draw(cached)
   else void image(pathUrl(src)).then(img=>{
    this.spriteCache.set(src,img);draw(img)
    // Gallery-only thumbnails do not change map pixels. Redrawing the full
    // native-size map for every decoded thumbnail stalls software-rendered CI.
   })
  }
  this.refreshGallerySelection()
  this.filterGallery()
 }
 private refreshGallerySelection(){
  this.gallery.querySelectorAll<HTMLButtonElement>('[data-asset]').forEach(b=>{
   const selected=b.dataset.asset===this.chosenAsset
   b.classList.toggle('we-active',selected)
   b.setAttribute('aria-pressed',String(selected))
  })
 }
 private filterGallery(){
  const query=this.objectSearch.value.trim().toLocaleLowerCase('de')
  let matching=0
  for(const el of this.gallery.children){
   if(!(el instanceof HTMLButtonElement))continue
   el.hidden=!visibleInBiome(el.dataset.biome||'Wald',this.biome)||
    (this.activeCategory!=='Alle'&&el.dataset.category!==this.activeCategory)||
    !el.textContent?.toLocaleLowerCase('de').includes(query)
   if(!el.hidden)matching++
  }
  for(const header of this.gallery.querySelectorAll<HTMLElement>('.we-object-group')){
   let following=header.nextElementSibling
   let visible=false
   while(following&&!following.classList.contains('we-object-group')){
    if(!(following as HTMLElement).hidden)visible=true
    following=following.nextElementSibling
   }
   header.hidden=!visible
  }
  this.gallery.setAttribute('data-found',String(matching))
 }
 private fitMap(){
  if(!this.w||!this.h)return
  this.zoom=Math.min(2.5,Math.max(.25,Math.min((this.viewport.clientWidth-24)/this.w,(this.viewport.clientHeight-24)/this.h)))
  this.offsetX=(this.viewport.clientWidth-this.w*this.zoom)/2
  this.offsetY=(this.viewport.clientHeight-this.h*this.zoom)/2
  this.updateStage()
 }
 private zoomAt(factor:number){
  const zoom=Math.max(.25,Math.min(2.5,this.zoom*factor))
  const x=this.viewport.clientWidth/2,y=this.viewport.clientHeight/2
  this.offsetX=x-(x-this.offsetX)*zoom/this.zoom
  this.offsetY=y-(y-this.offsetY)*zoom/this.zoom
  this.zoom=zoom;this.updateStage()
 }
 private toggleMapSize(){
  this.resizePanel.hidden=!this.resizePanel.hidden
  if(!this.resizePanel.hidden){
   this.resizeWidth.value=String(this.w/64)
   this.resizeHeight.value=String(this.h/64)
  }
 }
 private expandMap(){
  if(!this.document)return
  const oldW=this.w/64,oldH=this.h/64
  const newW=Number(this.resizeWidth.value),newH=Number(this.resizeHeight.value)
  const error=validateMapExpansion(oldW,oldH,newW,newH)
  if(error){this.status(error);return}
  this.saveHistory()
  for(const layer of this.layer){
   layer.gids=expandLayerGrid(layer.gids,oldW,oldH,newW,newH,expansionFill(layer.name))
   layer.node.setAttribute('width',String(newW))
   layer.node.setAttribute('height',String(newH))
  }
  this.document.documentElement.setAttribute('width',String(newW))
  this.document.documentElement.setAttribute('height',String(newH))
  this.w=newW*64;this.h=newH*64
  this.canvas.width=this.w;this.canvas.height=this.h
  for(const layer of this.layer)this.updateLayerNode(layer)
  this.resizePanel.hidden=true
  this.fitMap();this.redraw()
  this.status('Karte auf '+newW+' × '+newH+' Kacheln erweitert. Neue Fläche ist gesperrtes Wasser. Bitte speichern.')
 }
 private showSheet(idx:number){
  const sheet=this.sheet[Math.max(0,idx)]||this.sheet[0];if(!sheet)return
  // Keep layers independent: painting sand never removes grass, roads or bridges.
  const preferred=layerForTileset(sheet.source)
  const target=this.layer.findIndex(l=>l.name===preferred)
  if(target>=0){this.layerIndex=target;this.layerPicker.value=String(target);this.updateLayerHelp()}
  this.palette.replaceChildren()
  this.paletteTabs.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('we-active',this.sheet[i]===sheet))
  if(!sheet.img.naturalWidth){this.palette.textContent='Kachelgrafik konnte nicht geladen werden';return}
  for(let i=0;i<sheet.count;i++){
   const gid=sheet.first+i,b=elt<HTMLButtonElement>('button','we-tile');b.type='button';b.title=sheet.title+' · '+gid
   const c=elt<HTMLCanvasElement>('canvas');c.width=48;c.height=48
   const ctx=c.getContext('2d')!;ctx.imageSmoothingEnabled=false
   ctx.drawImage(sheet.img,(i%sheet.cols)*64,Math.floor(i/sheet.cols)*64,64,64,0,0,48,48)
   b.append(c)
   b.classList.toggle('we-active',this.chosenGid===gid)
   b.addEventListener('click',()=>{this.chosenGid=gid;this.showSheet(this.sheet.indexOf(sheet));this.setTool('tile')})
   this.palette.append(b)
  }
 }
 private objects():EditObject[]{
  return Array.from(this.document.querySelectorAll('map > objectgroup object')).map(getObj)
 }
 private redraw(){
  if(!this.document)return
  const ctx=this.canvas.getContext('2d')!
  ctx.clearRect(0,0,this.w,this.h);ctx.imageSmoothingEnabled=false
  for(const layer of this.layer){
   if(layer.node.getAttribute('visible')==='0')continue
   layer.gids.forEach((raw,i)=>{
    const gid=(raw>>>0)&0x1fffffff;if(!gid)return
    const sheet=[...this.sheet].reverse().find(s=>gid>=s.first&&gid<s.first+s.count)
    if(!sheet?.img.naturalWidth)return
    const tile=gid-sheet.first,x=(i%(this.w/64))*64,y=Math.floor(i/(this.w/64))*64
    if(raw>>>0 & 0xe0000000){
     ctx.save();ctx.translate(x+32,y+32)
     if(raw>>>0 & 0x80000000)ctx.scale(-1,1)
     if(raw>>>0 & 0x40000000)ctx.scale(1,-1)
     if(raw>>>0 & 0x20000000)ctx.rotate(Math.PI/2)
     ctx.drawImage(sheet.img,(tile%sheet.cols)*64,Math.floor(tile/sheet.cols)*64,64,64,-32,-32,64,64)
     ctx.restore()
    }else ctx.drawImage(sheet.img,(tile%sheet.cols)*64,Math.floor(tile/sheet.cols)*64,64,64,x,y,64,64)
   })
  }
  if(this.layer[this.layerIndex]?.name==='Wasser und Klippen · Kollision'&&(this.tool==='tile'||this.tool==='erase')){
   const current=this.layer[this.layerIndex]
   ctx.fillStyle='rgba(220,55,45,.35)'
   for(let i=0;i<current.gids.length;i++)if(current.gids[i]!==0)
    ctx.fillRect((i%(this.w/64))*64,Math.floor(i/(this.w/64))*64,64,64)
  }
  for(const obj of this.objects().sort((a,b)=>(a.y+a.h)-(b.y+b.h))){
   const asset=(art.assets as any)[obj.asset]
   const source=asset?.animations?.stand?.image
   const sprite=source?this.spriteCache.get(source):undefined
   if(asset&&sprite?.naturalWidth){
    ctx.drawImage(sprite,0,0,asset.frame[0],asset.frame[1],
     obj.x+obj.w/2-asset.foot[0],obj.y+obj.h-asset.foot[1],asset.frame[0],asset.frame[1])
   }else{
    ctx.fillStyle='#a78050';ctx.fillRect(obj.x,obj.y,obj.w,obj.h)
   }
   if(this.tool==='select'||this.selected===obj.node){
    ctx.strokeStyle=this.selected===obj.node?'#fff0a5':'#dff4d0aa'
    ctx.lineWidth=this.selected===obj.node?3:1
    ctx.strokeRect(obj.x-.5,obj.y-.5,Math.max(1,obj.w),Math.max(1,obj.h))
   }
  }
  const player=this.playerPosition(),hero=art.assets[this.playerGraphic()],heroImage=hero?this.spriteCache.get(hero.animations.stand.image):null
  if(player&&heroImage?.naturalWidth)ctx.drawImage(heroImage,0,0,...hero.frame,player.x+16-hero.foot[0],player.y+24-hero.foot[1],...hero.frame)
  if(this.tool==='tile'){
   ctx.strokeStyle='#ffffff50';ctx.lineWidth=1
   for(let x=0;x<=this.w;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,this.h);ctx.stroke()}
   for(let y=0;y<=this.h;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(this.w,y);ctx.stroke()}
  }
 }
 private updateStage(){
  this.stage.style.transform=`translate(${this.offsetX}px,${this.offsetY}px) scale(${this.zoom})`
  this.zoomText.textContent=Math.round(this.zoom*100)+' %'
 }
 private wheel(e:WheelEvent){
  e.preventDefault()
  const zoom=Math.max(.25,Math.min(2.5,this.zoom*(e.deltaY<0?1.12:.89)))
  const rect=this.viewport.getBoundingClientRect()
  const x=e.clientX-rect.left,y=e.clientY-rect.top
  this.offsetX=x-(x-this.offsetX)*zoom/this.zoom
  this.offsetY=y-(y-this.offsetY)*zoom/this.zoom
  this.zoom=zoom;this.updateStage()
 }
 private point(e:PointerEvent){
  const rect=this.canvas.getBoundingClientRect()
  return {x:Math.max(0,Math.min(this.w-1,(e.clientX-rect.left)/this.zoom)),
   y:Math.max(0,Math.min(this.h-1,(e.clientY-rect.top)/this.zoom))}
 }
 private saveHistory(){this.future=[];this.scheduleDraft();this.history.push(new XMLSerializer().serializeToString(this.document));if(this.history.length>35)this.history.shift();this.dirty=true}
 private updateLayerNode(layer:PaintLayer){
  const width=this.w/64
  const lines=[]
  for(let y=0;y<this.h/64;y++)lines.push(layer.gids.slice(y*width,(y+1)*width).join(','))
  layer.node.querySelector('data')!.textContent='\n'+lines.join(',\n')+'\n'
 }
 private repairWalkways(){
  const changes=repairPaintedWalkways(this.layer)
  if(!changes.length){this.status('Keine gesperrten Wege oder Biomflächen gefunden.');return}
  this.saveHistory()
  const collision=this.layer.find(l=>l.name==='Wasser und Klippen · Kollision')!
  for(const change of changes)collision.gids[change.index]=change.gid
  this.updateLayerNode(collision);this.redraw()
  this.status(changes.length+' Wege-/Biom-Kacheln entsperrt. Zum Übernehmen speichern.')
 }
 private paint(p:{x:number,y:number},erase=false){
  const x=Math.floor(p.x/64),y=Math.floor(p.y/64),i=y*(this.w/64)+x
  if(this.paintLast===i)return
  this.paintLast=i
  const layer=this.layer[this.layerIndex],gid=erase?0:this.chosenGid
  if(!layer)return
  const changes=erase?[]:walkabilityChanges(this.layer,i,layer.name,gid,this.autoWalkable)
  if(layer.gids[i]===gid&&!changes.length)return
  this.saveHistory()
  if(layer.gids[i]!==gid){layer.gids[i]=gid;this.updateLayerNode(layer)}
  for(const change of changes){
   const collision=this.layer.find(l=>l.name===change.name)
   if(collision){collision.gids[change.index]=change.gid;this.updateLayerNode(collision)}
  }
  this.redraw()
 }
 private selectAt(p:{x:number,y:number}){
  const objs=this.objects()
  const player=this.playerPosition(),a=art.assets[this.playerGraphic()]
  this.selectedPlayer=Boolean(player&&a&&p.x>=player.x+16-a.foot[0]+(a.animations.stand.visibleBounds?.[0]?.[0]||0)&&p.x<=player.x+16-a.foot[0]+(a.animations.stand.visibleBounds?.[0]?.[2]||a.frame[0])&&p.y>=player.y+24-a.foot[1]+(a.animations.stand.visibleBounds?.[0]?.[1]||0)&&p.y<=player.y+24)
  this.selected=this.selectedPlayer?null:[...objs].sort((a,b)=>a.y+a.h-b.y-b.h).reverse().find(o=>{const a=art.assets[o.asset],b=a?.animations.stand.visibleBounds?.[0];return b?p.x>=o.x+o.w/2-a.foot[0]+b[0]&&p.x<=o.x+o.w/2-a.foot[0]+b[2]&&p.y>=o.y+o.h-a.foot[1]+b[1]&&p.y<=o.y+o.h:p.x>=o.x-10&&p.x<=o.x+o.w+10&&p.y>=o.y-12&&p.y<=o.y+o.h+12})?.node||null
  this.updateDetails();this.redraw()
 }
 private createObject(p:{x:number,y:number}){
  const group=this.document.querySelector('map > objectgroup')
  if(!group)return
  this.saveHistory()
  const root=this.document.documentElement
  const id=asNumber(root.getAttribute('nextobjectid')||'1',1)
  root.setAttribute('nextobjectid',String(id+1))
  const choice=this.chosenAsset
  const kind=choice.startsWith('npc:')?'npc':choice.startsWith('monster:')?'monster':
   choice.startsWith('portal:')?'portal':'prop'
  const asset=kind==='prop'?choice:kind==='npc'?'female':kind==='monster'?
   enemyGraphic(choice.slice('monster:'.length)):'portal-marker'
  const definition=(art.assets as any)[asset]
  const el=this.document.createElement('object')
  const name=kind==='npc'?'Dorfbewohner':kind==='monster'?'Gegner':kind==='portal'?'Kartenportal':asset
  for(const [key,val] of Object.entries({id:String(id),name,class:kind,
    x:String(Math.round(p.x)),y:String(Math.round(p.y)),
    width:String(definition?.hitbox?.[0]||32),height:String(definition?.hitbox?.[1]||24)}))
    el.setAttribute(key,val)
  if(kind==='prop')setProp(el,'asset',asset)
  if(kind==='npc')setProp(el,'text','Hallo, nobby!')
  if(kind==='monster'){
   setProp(el,'enemy',choice.slice('monster:'.length))
   setProp(el,'level','1','int');setProp(el,'hp','0','int');setProp(el,'vision','110','int')
  }
  if(kind==='portal')setProp(el,'target',this.id==='wald'?'simplemap':'wald')
  group.append(el)
  // Placement remains active until the user explicitly selects another tool.
  this.selectedPlayer=false;this.selected=el;this.updateDetails()
  const sprite=definition?.animations?.stand?.image
  if(sprite&&!this.spriteCache.has(sprite))
   void image(pathUrl(sprite)).then(img=>{this.spriteCache.set(sprite,img);this.redraw()})
  this.redraw()
 }
 private startPointer(e:PointerEvent){
  if(!this.document)return
  if(e.button!==0&&e.button!==2&&e.button!==1)return
  e.preventDefault()
  this.canvas.setPointerCapture(e.pointerId)
  this.dragging=true;this.prev={x:e.clientX,y:e.clientY};this.paintLast=-1
  if(e.button!==0){this.panning=true;return}
  const p=this.point(e)
  if(this.tool==='tile'||this.tool==='erase')this.paint(p,this.tool==='erase')
  else if(this.tool==='object')this.createObject(p)
  else if(this.tool==='select')this.selectAt(p)
 }
 private movePointer(e:PointerEvent){
  if(!this.dragging||!this.prev)return
  if(this.panning){
   this.offsetX+=e.clientX-this.prev.x;this.offsetY+=e.clientY-this.prev.y
   this.prev={x:e.clientX,y:e.clientY};this.updateStage();return
  }
  const p=this.point(e)
  if(this.tool==='tile'||this.tool==='erase')this.paint(p,this.tool==='erase')
  else if(this.tool==='select'&&this.selected&&e.buttons===1){
   const dx=(e.clientX-this.prev.x)/this.zoom,dy=(e.clientY-this.prev.y)/this.zoom
   if(dx||dy){
    this.saveHistory()
    const x=Math.max(0,Math.min(this.w-1,asNumber(this.selected.getAttribute('x')||'0',0)+dx))
    const y=Math.max(0,Math.min(this.h-1,asNumber(this.selected.getAttribute('y')||'0',0)+dy))
    this.selected.setAttribute('x',String(Math.round(x)));this.selected.setAttribute('y',String(Math.round(y)))
    this.updateDetails();this.redraw()
   }
  }
  this.prev={x:e.clientX,y:e.clientY}
 }
 private endPointer(){this.dragging=false;this.panning=false;this.prev=null;this.paintLast=-1}
 private updateDetails(){
  this.detail.replaceChildren()
  if(this.selectedPlayer){this.detail.append(elt('h3','','Spieler · '+this.playerGraphic()),button('Grafiken bearbeiten',()=>void this.openAssets(this.playerGraphic())),elt('p','','Spielergrafiken betreffen die gesamte Klasse. Objektvarianten sind für platzierte Kartenobjekte verfügbar.'));return}
  if(!this.selected){this.detail.append(button('Spieler-Grafiken bearbeiten',()=>void this.openAssets(this.playerGraphic())));this.detail.append(elt('p','','Objekt auswählen, um Name, Grafik und Eigenschaften zu ändern.'));return}
  const obj=this.selected
  this.detail.append(button('Grafiken bearbeiten',()=>void this.openAssets(getObj(obj).asset)))
  const name=elt<HTMLInputElement>('input');name.value=obj.getAttribute('name')||''
  name.addEventListener('change',()=>{this.saveHistory();obj.setAttribute('name',name.value);this.redraw()})
  this.detail.append(field('Name',name))
  const kind=obj.getAttribute('class')||''
  this.detail.append(elt('p','',kind+' · ID '+obj.getAttribute('id')))
  if(kind==='prop'){
   const list=elt<HTMLSelectElement>('select')
   for(const [id,asset] of Object.entries(art.assets)){
    if(asset.kind!=='prop')continue
    const item=elt<HTMLOptionElement>('option','',id);item.value=id;list.append(item)
   }
   list.value=prop(obj,'asset')
   list.addEventListener('change',()=>{
    this.saveHistory();setProp(obj,'asset',list.value)
    const a=(art.assets as any)[list.value]
    obj.setAttribute('width',String(a.hitbox[0]));obj.setAttribute('height',String(a.hitbox[1]))
    const src=a.animations.stand.image
    if(!this.spriteCache.has(src))void image(pathUrl(src)).then(img=>{this.spriteCache.set(src,img);this.redraw()})
    this.redraw()
   })
   this.detail.append(field('Grafik',list))
  }
  if(kind==='monster'){
   const level=elt<HTMLInputElement>('input');level.type='number';level.min='1';level.max='100';level.value=prop(obj,'level')||'1'
   level.addEventListener('change',()=>{this.saveHistory();setProp(obj,'level',String(Math.max(1,Math.min(100,Math.floor(Number(level.value)||1)))),'int')})
   this.detail.append(field('Stufe',level))
  }
  if(kind==='npc'){
   const text=elt<HTMLTextAreaElement>('textarea');text.value=prop(obj,'text')
   text.addEventListener('change',()=>{this.saveHistory();setProp(obj,'text',text.value)})
   this.detail.append(field('Dialog',text))
  }
  if(kind==='portal'){
   const target=elt<HTMLInputElement>('input');target.value=prop(obj,'target')
   target.addEventListener('change',()=>{this.saveHistory();setProp(obj,'target',target.value.trim())})
   this.detail.append(field('Zielkarte (Dateiname ohne .tmx)',target))
  }
  this.detail.append(button('Objekt löschen',()=>this.removeSelected()))
 }
 private removeSelected(){
  if(!this.selected)return
  if(this.selected.getAttribute('class')==='start'){this.status('Der einzige Startpunkt darf nicht gelöscht werden.');return}
  this.saveHistory();this.selected.remove();this.selected=null;this.updateDetails();this.redraw()
 }
 private undo(){
  if(!this.history.length){this.status('Nichts rückgängig zu machen');return}
  this.future.push(this.xml())
  const previous=this.history.pop()!
  this.document=readXml(previous);this.selectedPlayer=false;this.selected=null
  const map=this.document.documentElement
  this.w=Number(map.getAttribute('width'))*64;this.h=Number(map.getAttribute('height'))*64
  this.canvas.width=this.w;this.canvas.height=this.h
  this.resizeWidth.value=String(this.w/64);this.resizeHeight.value=String(this.h/64)
  this.parseLayers();this.updateDetails()
  this.redraw();this.updateStage();this.dirty=this.xml()!==this.source;this.scheduleDraft();this.status(this.dirty?'Ungespeichert · Letzten Schritt rückgängig gemacht':'Gespeichert · Ausgangsstand erreicht')
 }
 private xml(){return '<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(this.document.documentElement)+'\n'}
 private export(){
  if(!this.document)return
  const blob=new Blob([this.xml()],{type:'application/xml'})
  const url=URL.createObjectURL(blob),a=elt<HTMLAnchorElement>('a')
  a.href=url;a.download=this.id+'.tmx';a.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
  this.status('TMX-Datei exportiert · kann in Tiled geöffnet werden')
 }
 private playerGraphic(){const p=this.engine.getCurrentPlayer?.(),c=p?.nobbyClass;return (typeof c==='function'?c():c)==='shaman'?'shaman':'hero'}
 private playerPosition(){const p=this.engine.getCurrentPlayer?.();if(!p)return null;return {x:typeof p.x==='function'?p.x():p.x||0,y:typeof p.y==='function'?p.y():p.y||0}}
 private async openAssets(id?:string){this.mapPane!.hidden=true;this.mapToolbar!.hidden=true;await this.assetEditor.open(id)}
 private async loadUserTilesets(catalog:any){
  for(const entry of catalog.assets.filter((a:any)=>a.definition.kind==='terrain')){
   const source=entry.definition.tilesetPath?.split('/').pop();if(!source)continue
   const url=pathUrl('map/'+source),response=await fetch(url,{cache:'no-store'});if(!response.ok)continue
   const tsx=readXml(await response.text()).documentElement,imgSource=tsx.querySelector('image')?.getAttribute('source')||''
   const img=await image(new URL(imgSource,new URL(url,location.href)).href),existing=this.sheet.find(s=>s.source===source)
   if(existing){existing.img=img;continue}
   const first=Math.max(1,...this.sheet.map(s=>s.first+s.count)),count=Number(tsx.getAttribute('tilecount'))
   const reference=this.document.createElement('tileset');reference.setAttribute('firstgid',String(first));reference.setAttribute('source',source);this.document.documentElement.insertBefore(reference,this.document.querySelector('map > layer'))
   this.sheet.push({first,count,cols:Number(tsx.getAttribute('columns')),img,source,title:entry.name})
  }
 }
 private scheduleDraft(){clearTimeout(this.draftTimer);this.draftTimer=setTimeout(()=>{if(this.document)void writeDraft('map:'+this.id,{updated:this.xml(),source:this.source,pending:this.saveSession.pending})},250)}
 private redo(){if(!this.future.length){this.status('Nichts zu wiederholen');return}const next=this.future.pop()!;this.history.push(this.xml());this.document=readXml(next);const m=this.document.documentElement;this.w=Number(m.getAttribute('width'))*64;this.h=Number(m.getAttribute('height'))*64;this.canvas.width=this.w;this.canvas.height=this.h;this.selectedPlayer=false;this.selected=null;this.parseLayers();this.updateDetails();this.redraw();this.updateStage();this.dirty=this.xml()!==this.source;this.scheduleDraft();this.status('Ungespeichert · Schritt wiederholt')}
 private async saveActive(){if(this.assetEditor.visible)await this.assetEditor.save();else await this.save()}
 private async save(){
  if(!this.document||this.saving)return
  if(!this.dirty){this.status('Gespeichert · Keine Änderungen vorhanden');return}
  if(!this.client.writable){this.status('Keine lokale Schreibverbindung. Bitte TMX exportieren.');return}
  const pending=this.saveSession.begin(this.id,this.source,this.xml());if(!pending)return
  this.saving=true;this.saveController=new AbortController();this.status('Wird gespeichert · Entwurf wird geprüft …');this.scheduleDraft()
  try{
   const result=await this.client.request('save',pending,{signal:this.saveController.signal})
   const ack=this.saveSession.acknowledge(this.xml());this.source=ack.source;this.dirty=ack.dirty
   this.pendingRefresh=Boolean(result.needsRefresh)||this.pendingRefresh
   this.status(this.dirty?'Gespeichert · Weitere Änderungen sind noch ungespeichert.':'Gespeichert, Spiel muss aktualisiert werden · '+(result.width??this.w/64)+' × '+(result.height??this.h/64)+' Kacheln.')
   if(this.dirty)this.scheduleDraft();else void writeDraft('map:'+this.id,null)
  }catch(error:any){if(error.status>=400&&error.status<500)this.saveSession.pending=null;this.status((error.status===409?'Externer Bearbeitungskonflikt':'Speichern fehlgeschlagen')+' · '+error.message+' · Entwurf bleibt erhalten. Speichern erneut ausführen oder TMX exportieren.');this.scheduleDraft()}
  finally{this.saving=false;this.saveController=null;this.saveSession.finish()}
 }
 private async refreshAfterClose(){
  if(this.dirty||this.assetEditor.dirty||this.saving||this.assetEditor.saving){this.status('Vor dem Aktualisieren alle Entwürfe speichern oder ausdrücklich verwerfen.');return}
  this.status('Gespeichert · Spielwelt wird aktualisiert …')
  try{await this.client.request('refresh',{}, {timeout:25000});this.pendingRefresh=false;await this.dispose();window.location.reload()}
  catch(error){this.status('Gespeichert, Spiel muss aktualisiert werden · Aktualisierung fehlgeschlagen: '+String(error)+' · Erneut „Spiel aktualisieren“ klicken.')}
 }
 private async dispose(){clearTimeout(this.draftTimer);window.removeEventListener('keydown',this.globalKey,true);window.removeEventListener('beforeunload',this.beforeUnload);this.assetEditor.destroy();await this.client.close();this.root.remove()}
 private close(){
  if(this.saving||this.assetEditor.saving){this.status('Speichern läuft. Abbrechen ist möglich; Entwurf bleibt erhalten.');return}
  if((this.dirty||this.assetEditor.dirty)&&!window.confirm('Ungespeicherte Änderungen verwerfen und Editor schließen? Lokale Wiederherstellungsentwürfe bleiben verfügbar.'))return
  this.dirty=false;this.assetEditor.dirty=false
  if(this.pendingRefresh){void this.refreshAfterClose();return}
  void this.dispose()
 }

}
let active=false
let latestEngine:any
let menuObserverInstalled=false
function addEditorMenuEntry(){
 const menu=document.querySelector<HTMLElement>('.rpg-ui-main-menu-layout')
 if(!menu||menu.querySelector('.we-launch'))return
 menu.append(button('🗺 Karteneditor',()=>{
  if(active||!latestEngine)return
  active=true
  new MapEditor(latestEngine)
  const observer=new MutationObserver(()=>{
   if(!document.querySelector('.we-overlay')){active=false;observer.disconnect()}
  })
  observer.observe(document.body,{childList:true})
 },'we-launch'))
}
export function ensureEditorMenu(engine:any){
 latestEngine=engine
 if(!menuObserverInstalled){
  menuObserverInstalled=true
  // Native RPG-JS menus can mount after onStep pauses. The observer ensures
  // the extra action is inserted even in that paused state.
  const observer=new MutationObserver(addEditorMenuEntry)
  observer.observe(document.body,{childList:true,subtree:true})
 }
 addEditorMenuEntry()
}
import { ENEMIES, enemyGraphic } from '../art/enemies.mjs'
