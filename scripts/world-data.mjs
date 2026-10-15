import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import xml from 'xml-js'

export const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const art=JSON.parse(fs.readFileSync(path.join(projectRoot,'src/art/registry.json'),'utf8'))
const list=value=>value==null?[]:Array.isArray(value)?value:[value]
const attrs=node=>node?._attributes??{}
const properties=node=>Object.fromEntries(list(node?.properties?.property).map(p=>[attrs(p).name,attrs(p).value??p._text??'']))
const read=file=>xml.xml2js(fs.readFileSync(file,'utf8'),{compact:true})
const number=(value,fallback,min,max,label)=>{
  const n=value==null||value===''?fallback:Number(value)
  if(!Number.isFinite(n)||n<min||n>max)throw Error(`${label}: Zahl zwischen ${min} und ${max} erwartet`)
  return n
}
const safeId=value=>/^[a-zA-Z0-9_-]+$/.test(value)

export function readWorld(file){
  const map=read(file).map,ma=attrs(map),mp=properties(map)
  if(mp.nobbyWorld!=='true'&&mp.nobbyWorld!==true)return null
  const id=path.basename(file,'.tmx');if(!safeId(id))throw Error(`${id}: ungültiger Kartenname`)
  if(ma.orientation!=='orthogonal'||ma.infinite==='1')throw Error(`${id}: endliche orthogonale Karte erforderlich`)
  if(Number(ma.tilewidth)!==art.tileSize||Number(ma.tileheight)!==art.tileSize)throw Error(`${id}: Tiny Swords benötigt ${art.tileSize}×${art.tileSize}-Pixel-Kacheln`)
  const width=Number(ma.width)*Number(ma.tilewidth),height=Number(ma.height)*Number(ma.tileheight)
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error(`${id}: ungültige Kartengröße`)
  const world={id,title:mp.title||id,width,height,start:null,objects:[]}
  function scan(group,ox=0,oy=0){
    ox+=Number(attrs(group).offsetx||0);oy+=Number(attrs(group).offsety||0)
    for(const raw of list(group.object)){
      const ra=attrs(raw);let base={}
      if(ra.template){
        const template=path.resolve(path.dirname(file),ra.template)
        if(!template.startsWith(path.join(projectRoot,'editor')+path.sep))throw Error(`${id}: Vorlage außerhalb editor/`)
        base=read(template).template?.object??{}
      }
      const a={...attrs(base),...ra},p={...properties(base),...properties(raw)}
      const kind=a.class||a.type
      if(!['start','monster','npc','portal','prop'].includes(kind))continue
      const x=number(a.x,0,0,width-1,`${id}/${a.id} x`)+ox,y=number(a.y,0,0,height-1,`${id}/${a.id} y`)+oy
      if(x<0||y<0||x>=width||y>=height)throw Error(`${id}/${a.id}: Objekt außerhalb der Karte`)
      if(kind==='start'){
        if(raw.point===undefined&&base.point===undefined)throw Error(`${id}: Startpunkt muss ein Punktobjekt sein; Vorlage Startpunkt.tx verwenden`)
        if(world.start)throw Error(`${id}: nur ein Startpunkt erlaubt`)
        world.start={x,y};continue
      }
      const o={id:`object-${a.id}`,kind,name:a.name||kind,x,y}
      if(world.objects.some(existing=>existing.id===o.id))throw Error(`${id}: doppelte Objekt-ID ${a.id}`)
      if(kind==='monster'){
        o.enemy=p.enemy||'ritter';if(!['ritter','berserker'].includes(o.enemy))throw Error(`${id}/${a.id}: unbekannter Gegnertyp ${o.enemy}`)
        o.level=number(p.level,1,1,100,`${id}/${a.id} Stufe`)
        if(!Number.isInteger(o.level))throw Error(`${id}/${a.id}: Stufe muss ganzzahlig sein`)
        o.hp=number(p.hp,0,0,100000,`${id}/${a.id} HP`)
        o.vision=number(p.vision,130,32,1000,`${id}/${a.id} Sichtweite`)
      }
      if(kind==='npc')o.text=p.text||'Hallo, Nobby!'
      if(kind==='portal'){o.target=p.target||'';if(!safeId(o.target))throw Error(`${id}/${a.id}: Zielkarte fehlt`)}
      if(kind==='prop'){
        o.asset=p.asset||'tree-oak'
        if(!art.assets[o.asset]||art.assets[o.asset].kind!=='prop')throw Error(`${id}/${a.id}: unbekanntes Deko-Asset ${o.asset}`)
      }
      world.objects.push(o)
    }
    for(const child of [...list(group.objectgroup),...list(group.group)])scan(child,ox,oy)
  }
  scan(map)
  if(!world.start)throw Error(`${id}: Startpunkt der Klasse start fehlt`)
  return world
}

export function compileWorlds(){
  const directory=path.join(projectRoot,'src/tiled')
  const worlds=fs.readdirSync(directory).filter(f=>f.endsWith('.tmx')).sort().map(f=>readWorld(path.join(directory,f))).filter(Boolean)
  for(const w of worlds){
    const map=read(path.join(directory,w.id+'.tmx')).map
    for(const reference of list(map.tileset)){
      const source=attrs(reference).source
      const file=source?path.resolve(directory,source):null
      if(!file||!fs.existsSync(file))throw Error(`${w.id}: Tileset fehlt: ${source}`)
      const tileset=read(file).tileset
      if(Number(attrs(tileset).tilewidth)!==art.tileSize||Number(attrs(tileset).tileheight)!==art.tileSize)throw Error(`${w.id}: Tileset ${source} hat falsches Raster`)
      const image=attrs(tileset.image).source
      if(!image||!fs.existsSync(path.resolve(path.dirname(file),image)))throw Error(`${w.id}: Tileset-Bild fehlt: ${image}`)
    }
  }
  if(!worlds.some(w=>w.id==='simplemap'))throw Error('Startkarte simplemap fehlt')
  for(const w of worlds)for(const o of w.objects)if(o.kind==='portal'&&!worlds.some(t=>t.id===o.target))throw Error(`${w.id}/${o.id}: Zielkarte ${o.target} existiert nicht`)
  const output=path.join(projectRoot,'src/generated/worlds.json'),content=JSON.stringify(worlds,null,2)+'\n'
  fs.mkdirSync(path.dirname(output),{recursive:true})
  if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==content)fs.writeFileSync(output,content)
  return worlds
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const worlds=compileWorlds();console.log(`Karten bereit: ${worlds.map(w=>`${w.title} (${w.objects.length} Objekte)`).join(', ')}`)}
  catch(error){console.error(error.message);process.exitCode=1}
}
