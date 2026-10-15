import fs from 'node:fs'
import path from 'node:path'
import xml from 'xml-js'
import { projectRoot, compileWorlds } from './world-data.mjs'

const id=process.argv[2]
if(!id||!/^[a-zA-Z0-9_-]+$/.test(id))throw Error('Aufruf: npm run world:new -- meine-welt (Buchstaben, Zahlen, - und _)')
const target=path.join(projectRoot,'src/tiled',id+'.tmx')
if(fs.existsSync(target))throw Error(`Karte ${id} existiert bereits; nichts überschrieben`)
const data=xml.xml2js(fs.readFileSync(path.join(projectRoot,'src/tiled/simplemap.tmx'),'utf8'),{compact:true})
data.map.properties={property:[{_attributes:{name:'nobbyWorld',type:'bool',value:'true'}},{_attributes:{name:'title',value:id}}]}
data.map.objectgroup={_attributes:{id:'3',name:'Spiellogik'},object:[
  {_attributes:{id:'1',name:'Start',class:'start',x:'300',y:'300'},point:{}},
  {_attributes:{id:'2',name:'Ritter',class:'monster',x:'500',y:'400'},point:{},properties:{property:[{_attributes:{name:'enemy',value:'ritter'}},{_attributes:{name:'level',type:'int',value:'1'}}]}}
]}
data.map._attributes.nextobjectid='3'
fs.writeFileSync(target,xml.js2xml(data,{compact:true,spaces:1})+'\n')
compileWorlds()
console.log(`Erstellt: ${target}\nIn Tiled öffnen und gestalten. Für einen Übergang eine portal-Vorlage mit target=${id} auf der anderen Karte platzieren.`)
