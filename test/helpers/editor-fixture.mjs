import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {PNG} from 'pngjs'
export const pixel=(color=[255,0,0,255],w=4,h=4)=>{const p=new PNG({width:w,height:h});for(let i=0;i<p.data.length;i+=4)p.data.set(color,i);return PNG.sync.write(p).toString('base64')}
export const simpleMap=(cell=0)=>`<?xml version="1.0" encoding="UTF-8"?><map width="2" height="2"><layer id="1" name="Boden" width="2" height="2"><data encoding="csv">${cell},0,0,0</data></layer><objectgroup id="2" name="Spiellogik"/></map>`
export function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nobby-editor-unit-'))
 const write=(name,data)=>{const f=path.join(root,name);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof data==='object'&&!Buffer.isBuffer(data)?JSON.stringify(data):data)}
 const base={version:1,tileSize:64,assets:{test:{kind:'prop',frame:[4,4],foot:[2,4],hitbox:[2,2],animations:{stand:{image:'tiny-swords/test.png',frames:1,rows:1,fps:5,visibleBounds:[[0,0,3,3]]}}}}}
 write('art/registry-base.json',base);write('src/art/registry.json',base);write('art/user-assets/manifest.json',{version:1,revision:0,assets:{},trash:{}});write('public/tiny-swords/test.png',Buffer.from(pixel(),'base64'));write('src/tiled/simplemap.tmx',simpleMap())
 return {root,write,read:name=>fs.readFileSync(path.join(root,name),'utf8'),json:name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8')),cleanup:()=>fs.rmSync(root,{recursive:true,force:true})}
}
// Handcrafted GIF89a, independent from Sharp's encoder: clear-code-per-pixel
// keeps LZW codes three bits wide. Frame rectangles exercise disposal 2 and 3.
export function disposalGif(){
 const chunks=[Buffer.from('GIF89a'),Buffer.from([3,0,1,0,0x81,0,0]),Buffer.from([0,0,0,255,0,0,0,255,0,0,0,255])]
 const frame=(left,width,indices,disposal,delay,transparent=false)=>{
  chunks.push(Buffer.from([0x21,0xf9,4,(disposal<<2)|(transparent?1:0),delay,0,0,0,0x2c,left,0,0,0,width,0,1,0,0,2]))
  const codes=indices.flatMap(i=>[4,i]).concat(5),bytes=[];let bits=0,n=0
  for(const c of codes){bits|=c<<n;n+=3;while(n>=8){bytes.push(bits&255);bits>>=8;n-=8}}if(n)bytes.push(bits&255)
  chunks.push(Buffer.from([bytes.length,...bytes,0]))
 }
 frame(0,3,[1,1,0],1,3,true) // red red transparent
 frame(1,1,[2],2,7,true) // green replaces x1, then clears it
 frame(0,1,[3],3,12,true) // blue replaces x0, then restores previous
 frame(2,1,[2],1,20,true) // green at x2: red survives restoration
 chunks.push(Buffer.from([0x3b]));return Buffer.concat(chunks).toString('base64')
}
