/** Low-cost, deterministic grazing-area logic. No timers, no random teleporting.
 * Sheep only select one-tile cardinal steps on actual grass or forest-ground. */
export const SHEEP_TILE=64
export const SHEEP_HOME_RADIUS=4
const GID_MASK=0x1fffffff
const directions=[
 {direction:'left',dx:-1,dy:0},{direction:'right',dx:1,dy:0},
 {direction:'up',dx:0,dy:-1},{direction:'down',dx:0,dy:1}
]
export function makePastureMask(width,height,layers,tilesets){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw Error('Invalid pasture dimensions')
 const grass=layers.find(l=>l.name==='Gelände')
 const allowed=new Uint8Array(Math.ceil(width*height/8))
 const get=(name,i)=>layers.find(l=>l.name===name)?.gids[i]??0
 const ranges=tilesets
  .filter(t=>t.source==='grass.tsx'||t.source==='forest.tsx')
  .map(t=>({start:t.firstgid,end:t.firstgid+t.count}))
 if(!grass||!ranges.length)return {width,height,bits:Buffer.from(allowed).toString('hex')}
 for(let i=0;i<width*height;i++){
  const gid=(Number(grass.gids[i])>>>0)&GID_MASK
  if(!ranges.some(r=>gid>=r.start&&gid<r.end))continue
  if(['Wüste','Felsboden','Schnee','Wege','Brücke','Wasser und Klippen · Kollision']
   .some(name=>get(name,i)!==0))continue
  allowed[i>>3]|=1<<(i&7)
 }
 return {width,height,bits:Buffer.from(allowed).toString('hex')}
}
export function unpackPasture(p){
 if(!p||!Number.isInteger(p.width)||!Number.isInteger(p.height)||typeof p.bits!=='string')return null
 const expected=Math.ceil(p.width*p.height/8)*2
 if(p.width<=0||p.height<=0||p.bits.length!==expected||!/^[a-f0-9]*$/i.test(p.bits))return null
 const bits=new Uint8Array(p.bits.length/2)
 for(let i=0;i<bits.length;i++)bits[i]=parseInt(p.bits.slice(i*2,i*2+2),16)
 return {width:p.width,height:p.height,bits}
}
export function pastureHas(mask,x,y){
 if(!mask||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=mask.width||y>=mask.height)return false
 const i=y*mask.width+x
 return Boolean(mask.bits[i>>3]&(1<<(i&7)))
}
export function seedSheep(id){let h=2166136261;for(const c of String(id)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
export function nextSeed(seed){return (Math.imul(seed>>>0,1664525)+1013904223)>>>0}
const tileOf=n=>Math.floor(n/SHEEP_TILE)
const checkWalk=(nav,x,y)=>{
 if(!nav)return true
 const cell=nav.cell||16
 const col=Math.round(x/cell),row=Math.round(y/cell)
 if(col<0||row<0||col>=nav.cols||row>=nav.rows)return false
 const i=row*nav.cols+col
 return !(nav.bits[i>>3]&(1<<(i&7)))
}
export function sheepStep({mask,nav,home,position,seed,step=0,radius=SHEEP_HOME_RADIUS}){
 const state=nextSeed(seed)
 const x=tileOf(position.x),y=tileOf(position.y)
 const hx=tileOf(home.x),hy=tileOf(home.y)
 if(!pastureHas(mask,x,y))return {kind:'graze',duration:2.5,seed:state}
 // The sheep's quiet rhythm alternates grazing and cautious strolling.
 if(step%3===0||state%10<4)return {kind:'graze',duration:2.1+(state%20)/10,seed:state}
 const offset=state%4
 for(let i=0;i<4;i++){
  const dir=directions[(offset+i)%4],tx=x+dir.dx,ty=y+dir.dy
  if(Math.abs(tx-hx)>radius||Math.abs(ty-hy)>radius||!pastureHas(mask,tx,ty))continue
  let safe=true
  // Four 16-pixel navigation samples along the segment; no water or solid props.
  for(let k=1;k<=4;k++){
   const px=position.x+dir.dx*k*16,py=position.y+dir.dy*k*16
   if(!checkWalk(nav,px,py)){safe=false;break}
  }
  if(safe)return {kind:'walk',direction:dir.direction,seed:state,duration:0}
 }
 return {kind:'graze',duration:2.5,seed:state}
}
