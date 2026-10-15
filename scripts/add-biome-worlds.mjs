/** Explicit, additive authored-map creation. Existing TMX files are never written. */
import fs from 'node:fs'
const W=32,H=26,T=64
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;')
const prop=(key,value)=>`<property name="${key}" value="${esc(value)}"/>`
const definitions=[
 {id:'sunscar',title:'Goldsand-Oase',layer:'Wüste',base:228,props:['desert-cactus','desert-cactus-small','desert-agave','desert-prickly-pear','desert-rock','desert-shrub'],enemies:['scorpion','serpent'],building:'desert-house',next:'frostwild'},
 {id:'frostwild',title:'Frostpranken-Pass',layer:'Schnee',base:336,props:['snow-fir','snow-fir','snow-shrub','snow-crystals','snow-shrub','rock'],enemies:['polar-bear','polar-bear'],building:'snow-crystals',next:'verdant'},
 {id:'verdant',title:'Smaragd-Dschungel',layer:'Dschungel',base:408,props:['jungle-palm','jungle-tree','jungle-fern','jungle-palm','jungle-tree','jungle-fern'],enemies:['serpent','berserker'],building:'jungle-tree',next:'sunscar'}
]
const art=JSON.parse(fs.readFileSync('src/art/registry.json','utf8'))
for(const d of definitions){
 const file=`src/tiled/${d.id}.tmx`
 if(fs.existsSync(file)){console.log(`Beibehalten: ${file}`);continue}
 for(const id of [...d.props,d.building])if(!art.assets[id])throw Error('Missing biome art '+id)
 const n=W*H,land=new Uint8Array(n),collision=Array(n).fill(1),ground=Array(n).fill(0),biome=Array(n).fill(0),road=Array(n).fill(0),bridge=Array(n).fill(0)
 const inside=(x,y)=>x>=0&&y>=0&&x<W&&y<H
 const has=(x,y)=>inside(x,y)&&land[y*W+x]
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  land[y*W+x]=x>=2+Math.round(Math.sin(y*.5))&&x<W-3+Math.round(Math.sin(y*.4))&&y>=2+Math.round(Math.sin(x*.3))&&y<H-3+Math.round(Math.sin(x*.4))&&!(x>=21&&x<=22)?1:0
 }
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x
  if(!land[i])continue
  const cx=!has(x-1,y)?0:!has(x+1,y)?2:1,cy=!has(x,y-1)?0:!has(x,y+1)?2:1
  ground[i]=2+cy*9+cx;biome[i]=d.base+cy*9+cx;collision[i]=0
  if((y===13||y===14)&&x>=5&&x<=27)road[i]=(d.layer==='Schnee'?399:390)+(y===13?0:6)+(x===5?0:x===27?2:1)
 }
 for(let y=13;y<=14;y++)for(let x=20;x<=23;x++){
  bridge[y*W+x]=65+(y-13)*4+x-20;collision[y*W+x]=0;road[y*W+x]=0
 }
 let id=2
 const objects=[]
 const object=(kind,name,x,y,values={})=>{
  const attrs=kind==='prop'?art.assets[values.asset]?.hitbox:[32,24]
  objects.push(`<object id="${id++}" name="${esc(name)}" class="${kind}" x="${x*T+16}" y="${y*T}" width="${attrs?.[0]??32}" height="${attrs?.[1]??24}"><properties>${Object.entries(values).map(([k,v])=>prop(k,v)).join('')}</properties></object>`)
 }
 object('portal','Zurück zur ersten Insel',5,15,{target:'simplemap'})
 object('portal','Zum nächsten Biom',27,15,{target:d.next})
 object('npc','Wegweiser',8,15,{text:`Willkommen, nobby! ${d.title}: Die Reisesteine führen zur Insel und ins nächste Biom.`})
 object('prop',d.building,10,9,{asset:d.building})
 for(const [x,y]of [[5,7],[7,9],[12,6],[15,8],[18,6],[25,7],[27,9],[6,19],[10,21],[14,19],[17,21],[25,20],[28,18]]){
  const asset=d.props[(x+y)%d.props.length];object('prop',asset,x,y,{asset})
 }
 for(const [index,[x,y]]of [[15,15],[18,18],[26,12],[25,17]].entries())
  object('monster',d.enemies[index%2]==='polar-bear'?'Frostpranke':d.enemies[index%2]==='scorpion'?'Sandstachel':'Dünenwächter',x,y,{enemy:d.enemies[index%2],level:2+index,hp:0,vision:190})
 const layer=(name,gids,hidden=false)=>`<layer id="${id++}" name="${name}" width="${W}" height="${H}"${hidden?' visible="0"':''}><data encoding="csv">\n${Array.from({length:H},(_,y)=>gids.slice(y*W,(y+1)*W).join(',')).join(',\n')}\n</data></layer>`
 const references=[[1,'water-blue.tsx'],[2,'grass.tsx'],[56,'path.tsx'],[65,'bridge.tsx'],[73,'water-background-blue.tsx'],[74,'foam.tsx'],[218,'path-details.tsx'],[228,'desert.tsx'],[282,'rocky.tsx'],[336,'snow.tsx'],[390,'desert-path.tsx'],[399,'snow-path.tsx'],[408,'jungle.tsx']]
 const layers=layer('Wassergrund',Array(n).fill(73))+layer('Uferwellen',Array(n).fill(0))+layer('Gelände',ground)+['Wüste','Felsboden','Schnee','Dschungel'].map(name=>layer(name,name===d.layer?biome:Array(n).fill(0))).join('')+layer('Wasser und Klippen · Kollision',collision,true)+layer('Wege',road)+layer('Brücke',bridge)
 const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<map version="1.10" tiledversion="1.12.2" orientation="orthogonal" renderorder="right-down" width="${W}" height="${H}" tilewidth="64" tileheight="64" infinite="0" nextlayerid="${id+2}" nextobjectid="${id+2}"><properties><property name="nobbyWorld" type="bool" value="true"/>${prop('title',d.title)}</properties>${references.map(([gid,source])=>`<tileset firstgid="${gid}" source="${source}"/>`).join('')}${layers}<objectgroup id="${id+1}" name="Spiellogik"><object id="1" name="Start" class="start" x="400" y="832"><point/></object>${objects.join('')}</objectgroup></map>\n`
 fs.writeFileSync(file,xml,{flag:'wx'});console.log('Hinzugefügt: '+file)
}
