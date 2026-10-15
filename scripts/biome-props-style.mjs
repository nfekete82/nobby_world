/**
 * Native-resolution scenery for the Tiny Swords world.
 * Deliberately uses the pack's slate outlines, grouped pixel highlights,
 * upper-left lighting and subdued shadows instead of flat vector primitives.
 * Every renderer writes RGBA directly; reproducible, no network or AI at build.
 */
const K={
 ink:[38,51,65,255],inkSoft:[59,71,76,255],shadow:[93,80,67,255],
 sand:[224,187,120,255],cream:[246,220,164,255],plaster:[224,184,119,255],
 clay:[171,113,74,255],brick:[196,135,82,255],brickHi:[247,199,135,255],
 roof:[154,83,66,255],roofHi:[207,121,84,255],roofDeep:[108,64,64,255],
 door:[73,62,60,255],wood:[121,84,60,255],woodHi:[190,137,80,255],
 greenDeep:[27,78,75,255],greenShade:[39,110,91,255],green:[61,148,103,255],
 greenHi:[111,189,117,255],greenPale:[162,209,131,255],
 leafDeep:[33,81,91,255],leaf:[48,130,118,255],leafHi:[85,189,151,255],
 snow:[242,246,224,255],snowBlue:[183,218,213,255],snowShade:[124,173,179,255],
 rockDeep:[71,85,92,255],rock:[124,136,134,255],rockLight:[185,185,158,255],
 canvas:[215,166,109,255],canvasHi:[248,216,154,255]
}
const H=(x,y,seed=0)=>(Math.imul((x|0)+91+seed,73856093)^Math.imul((y|0)+29,19349663))>>>0
function px(p,x,y,c){x=Math.floor(x);y=Math.floor(y);if(x>=0&&y>=0&&x<p.width&&y<p.height)p.data.set(c,(y*p.width+x)*4)}
function block(p,x,y,w,h,c){
 for(let yy=Math.max(0,Math.floor(y));yy<Math.min(p.height,Math.ceil(y+h));yy++)
 for(let xx=Math.max(0,Math.floor(x));xx<Math.min(p.width,Math.ceil(x+w));xx++)px(p,xx,yy,c)
}
function oval(p,cx,cy,rx,ry,c){
 for(let y=Math.max(0,Math.floor(cy-ry));y<=Math.min(p.height-1,Math.ceil(cy+ry));y++)
 for(let x=Math.max(0,Math.floor(cx-rx));x<=Math.min(p.width-1,Math.ceil(cx+rx));x++)
 if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)px(p,x,y,c)
}
function polygon(p,points,c){
 const minY=Math.max(0,Math.floor(Math.min(...points.map(v=>v[1])))),maxY=Math.min(p.height-1,Math.ceil(Math.max(...points.map(v=>v[1]))))
 for(let y=minY;y<=maxY;y++) {
  const hits=[]
  for(let i=0;i<points.length;i++){
   const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length]
   if((ay<=y&&by>y)||(by<=y&&ay>y))hits.push(ax+(y-ay)*(bx-ax)/(by-ay))
  }
  hits.sort((a,b)=>a-b)
  for(let k=0;k+1<hits.length;k+=2)block(p,Math.ceil(hits[k]),y,Math.max(0,Math.floor(hits[k+1])-Math.ceil(hits[k])+1),1,c)
 }
}
function crack(p,points,c){
 for(let i=0;i+1<points.length;i++){
  let [x,y]=points[i], [x1,y1]=points[i+1]
  const count=Math.max(Math.abs(x1-x),Math.abs(y1-y))
  for(let t=0;t<=count;t++){const s=count?t/count:0;px(p,x+(x1-x)*s,y+(y1-y)*s,c)}
 }
}
function shadow(p,x,y,rx,ry){oval(p,x,y,rx,ry,K.shadow);oval(p,x-5,y-2,Math.max(2,rx-7),Math.max(1,ry-2),[139,110,82,255])}
function dryGrain(p,x,y,w,h,seed){
 for(let i=0;i<Math.floor(w*h/40);i++){
  const xx=x+(H(i,11,seed)%w),yy=y+(H(i,59,seed)%h)
  const off=(yy*p.width+xx)*4
  if(xx<0||yy<0||xx>=p.width||yy>=p.height||p.data[off+3]!==255)continue
  const [r,g,b]=p.data.subarray(off,off+3)
  if(r>=160&&g>=105&&b>=65)block(p,xx,yy,1+(H(i,5)%3),1+(H(i,9)%2),H(i,4)%4===0?K.brick:K.brickHi)
 }
}
function ribs(p,x,y,length){
 for(let row=y+9;row<y+length-3;row+=8){
  const j=H(row,x)%4
  px(p,x-3,row,K.greenDeep);block(p,x+2,row+j,2,3,K.greenHi)
  if(H(row,x,2)%3===0){px(p,x-9,row-2,K.cream);px(p,x+9,row+1,K.cream)}
 }
}
function cactus(p,small=false){
 const cx=32,foot=112,top=small?43:20,half=small?5:7
 shadow(p,cx,115,18,4)
 // Curved side arms: dark silhouette, internal shade and upper-left highlight.
 const arms=small?[{x:40,y:75,dir:1,h:16},{x:24,y:89,dir:-1,h:15}]:
 [{x:41,y:66,dir:1,h:23},{x:22,y:78,dir:-1,h:23}]
 for(const a of arms){
  const tip=a.x+a.dir*(small?12:13)
  block(p,Math.min(cx,tip)-5,a.y,Math.abs(cx-tip)+10,10,K.ink)
  oval(p,tip,a.y+5,6,6,K.ink)
  block(p,tip-6,a.y-a.h+6,12,a.h,K.ink)
  oval(p,tip,a.y-a.h+6,6,6,K.ink)
  block(p,Math.min(cx,tip)-3,a.y+2,Math.abs(cx-tip)+6,6,K.greenShade)
  block(p,tip-4,a.y-a.h+6,8,a.h,K.green)
  block(p,tip-3,a.y-a.h+8,2,a.h-6,K.greenHi)
  oval(p,tip,a.y-a.h+6,4,4,K.greenHi)
  for(let k=0;k<3;k++)px(p,tip+(a.dir*5),a.y-a.h+9+k*6,K.cream)
 }
 block(p,cx-half-2,top+6,2*half+4,foot-top-5,K.ink)
 oval(p,cx,top+7,half+2,8,K.ink)
 block(p,cx-half,top+8,half*2,foot-top-11,K.greenDeep)
 block(p,cx-half+2,top+6,half*2-3,foot-top-8,K.greenShade)
 block(p,cx-2,top+7,4,foot-top-9,K.green)
 block(p,cx-half+3,top+13,2,foot-top-20,K.greenHi)
 oval(p,cx,top+7,half,6,K.green)
 ribs(p,cx,top,foot-top)
 px(p,cx,top-1,K.cream)
}
function rock(p){
 shadow(p,32,57,23,5)
 polygon(p,[[6,49],[8,39],[17,31],[20,21],[35,20],[43,25],[51,31],[58,45],[55,51],[44,56],[17,55]],K.ink)
 polygon(p,[[9,46],[12,37],[21,29],[24,23],[35,23],[40,28],[48,33],[54,43],[51,50],[39,54],[17,52]],K.rockDeep)
 polygon(p,[[12,38],[21,29],[26,23],[35,24],[39,30],[29,42],[17,46]],K.rockLight)
 polygon(p,[[40,29],[50,34],[54,44],[48,50],[37,49],[29,42]],K.rock)
 crack(p,[[27,24],[30,37],[26,46]],K.inkSoft)
 crack(p,[[42,36],[45,41],[41,48]],K.inkSoft)
 block(p,16,32,7,2,K.snow);block(p,33,47,5,2,K.rockLight)
 for(let i=0;i<14;i++){let x=12+H(i,3)%40,y=26+H(i,9)%25;if(p.data[(y*64+x)*4+3])px(p,x,y,K.rockLight)}
}
function window(p,x,y){
 block(p,x-2,y-2,20,27,K.ink)
 block(p,x,y,16,22,K.wood)
 block(p,x+3,y+3,10,16,K.door)
 block(p,x+3,y+3,3,13,K.rockLight)
 block(p,x+8,y+3,2,16,K.woodHi)
 block(p,x-4,y+20,23,5,K.brickHi)
}
function tiledRoof(p,left,top,right,bottom){
 polygon(p,[[left,top+11],[left+12,top],[right-7,top],[right,bottom-6],[right-7,bottom],[left+5,bottom]],K.ink)
 polygon(p,[[left+4,top+10],[left+13,top+4],[right-10,top+4],[right-4,bottom-7],[right-10,bottom-4],[left+7,bottom-4]],K.roofDeep)
 polygon(p,[[left+6,top+13],[left+15,top+6],[right-14,top+6],[right-7,bottom-10],[left+10,bottom-8]],K.roof)
 for(let y=top+11,row=0;y<bottom-9;y+=8,row++)
 for(let x=left+12+(row%2)*5;x<right-12;x+=11){
  block(p,x,y,7,3,K.roofHi);px(p,x-1,y+4,K.inkSoft)
 }
 block(p,left+7,bottom-11,right-left-15,3,K.roofHi)
}
function house(p,kind){
 shadow(p,64,172,51,8)
 if(kind==='tent'){
  polygon(p,[[7,158],[60,48],[69,48],[121,158],[111,164],[17,164]],K.ink)
  polygon(p,[[13,154],[61,54],[65,54],[111,154],[108,158],[19,158]],K.canvas)
  polygon(p,[[66,57],[64,151],[112,154]],K.roof)
  polygon(p,[[57,68],[51,135],[29,154],[20,154]],K.canvasHi)
  polygon(p,[[46,160],[64,105],[81,160]],K.ink)
  polygon(p,[[54,158],[64,117],[74,158]],K.door)
  for(let i=0;i<5;i++){let x=24+i*19;block(p,x,159,4,6,K.wood);block(p,x+3,158,8,2,K.canvasHi)}
  crack(p,[[14,155],[8,169]],K.wood);crack(p,[[115,155],[122,168]],K.wood)
  return
 }
 // Adobe sandstone walls, recesses and uneven edge stones.
 block(p,16,91,96,75,K.ink)
 block(p,20,93,88,69,K.plaster)
 block(p,21,95,7,64,K.cream)
 block(p,100,96,7,64,K.clay)
 dryGrain(p,22,97,84,59,kind==='temple'?11:3)
 for(let x=20;x<109;x+=9){block(p,x,159,8,4,K.brick);if(H(x,6)%3===0)block(p,x,161,3,2,K.cream)}
 if(kind==='temple'){
  block(p,9,75,110,21,K.ink);block(p,13,78,102,15,K.clay)
  block(p,17,78,95,5,K.cream)
  for(let x=17;x<116;x+=13)block(p,x,84,9,3,K.brickHi)
  for(let x of [31,97]){
   block(p,x-9,91,18,76,K.ink);block(p,x-6,93,12,70,K.rockLight)
   for(let y=105;y<149;y+=13)block(p,x-4,y,8,2,K.rock)
  }
  oval(p,64,127,22,26,K.ink)
  block(p,43,127,42,36,K.ink)
  oval(p,64,129,16,21,K.door)
  block(p,48,129,32,36,K.door)
  block(p,61,124,6,40,K.wood)
  block(p,48,160,33,5,K.brickHi)
  for(let x of [18,109]){block(p,x-3,80,5,4,K.snow)}
  return
 }
 tiledRoof(p,10,61,119,100)
 block(p,20,96,89,10,K.clay)
 for(const x of [28,91])window(p,x-6,117)
 block(p,49,127,32,39,K.ink)
 oval(p,65,131,15,13,K.ink)
 block(p,53,131,24,33,K.wood)
 block(p,64,132,2,31,K.inkSoft)
 block(p,57,145,3,3,K.brickHi)
 block(p,45,164,41,5,K.rockLight)
 for(let x=15;x<117;x+=18)block(p,x,100,9,3,K.brickHi)
}
function bough(p,cx,top,w,h,level){
 // Layered, feathery branch silhouette: zig-zag tips (not stacked triangles).
 const pts=[[cx,top],[cx+7,top+14],[cx+w*.37,top+h*.54],
 [cx+w*.30,top+h*.57],[cx+w*.62,top+h*.77],[cx+w*.52,top+h*.78],
 [cx+w,top+h-7],[cx+w*.81,top+h+1],[cx+w*.58,top+h-2],
 [cx+w*.42,top+h+5],[cx+w*.19,top+h],[cx,top+h+7],
 [cx-w*.28,top+h],[cx-w*.48,top+h+4],[cx-w*.64,top+h-3],
 [cx-w,top+h-5],[cx-w*.52,top+h*.76],[cx-w*.65,top+h*.73],
 [cx-w*.32,top+h*.54],[cx-w*.40,top+h*.50],[cx-7,top+11]]
 polygon(p,pts,K.ink)
 const inner=pts.map(([x,y])=>[cx+(x-cx)*.88,top+5+(y-top)*.84])
 polygon(p,inner,K.leafDeep)
 for(let k=0;k<10;k++){
  let x=cx-w+9+(H(level,k)%Math.max(1,2*w-18)),y=top+22+H(k,level)%Math.max(1,h-20)
  const i=(Math.floor(y)*p.width+Math.floor(x))*4
  if(i>=0&&p.data[i]===K.leafDeep[0]&&p.data[i+1]===K.leafDeep[1])
   block(p,x,y,4+(H(k,level,4)%7),2+(H(k,level,8)%3),K.leafHi)
 }
 // Snow adheres to top branch edges; dark teal remains under the boughs.
 polygon(p,[[cx,top+6],[cx+8,top+17],[cx+w*.31,top+h*.54],
 [cx+w*.55,top+h*.72],[cx+w*.34,top+h*.69],
 [cx+w*.12,top+h*.61],[cx,top+h*.61],
 [cx-w*.18,top+h*.63],[cx-w*.57,top+h*.71],
 [cx-w*.24,top+h*.45],[cx-6,top+15]],K.snowBlue)
 polygon(p,[[cx,top+7],[cx+5,top+16],[cx+w*.26,top+h*.50],
 [cx+w*.42,top+h*.65],[cx+w*.17,top+h*.57],
 [cx,top+h*.49],[cx-w*.23,top+h*.57],
 [cx-w*.43,top+h*.65],[cx-w*.21,top+h*.42],[cx-6,top+15]],K.snow)
 for(let i=0;i<7;i++){
  const x=cx-w*.65+(H(level,i,9)%(Math.max(2,Math.round(w*1.3))))
  const y=top+h*.68+(H(level,i,5)%12)
  if(x>3&&x<p.width-4)block(p,x,y,3+H(i,level)%5,2,K.snowShade)
 }
}
function pine(p){
 shadow(p,64,173,28,6)
 block(p,58,114,13,59,K.ink)
 block(p,61,116,8,56,K.wood)
 block(p,62,132,3,38,K.woodHi)
 // Largest canopy in back. Upper smaller branch tiers overlap it.
 for(let level=3;level>=0;level--){
  const y=11+level*32,w=17+level*12
  bough(p,64,y,w,48,level)
 }
 block(p,61,7,4,15,K.snow)
}
function agave(p){
 shadow(p,32,56,20,5)
 for(let i=0;i<9;i++){
  const angle=(i/9)*Math.PI*2,tipx=32+Math.cos(angle)*25,tipy=49+Math.sin(angle)*14
  const root=[32,51],vx=Math.cos(angle),vy=Math.sin(angle)
  polygon(p,[[32-vy*6,49+vx*4],[tipx,tipy-8],[32+vy*5,52-vx*4]],K.ink)
  polygon(p,[[32-vy*3,49+vx*3],[tipx-vx*3,tipy-6],[32+vy*3,52-vx*3]],i%2?K.greenShade:K.green)
 }
 for(let i=0;i<5;i++)polygon(p,[[32,50],[17+i*7,36-H(i,1)%11],[29+i*2,54]],i%2?K.greenHi:K.greenShade)
}
function shrub(p){
 shadow(p,32,55,18,4)
 block(p,30,34,4,22,K.wood)
 for(let i=0;i<11;i++){
  const x=12+H(i,4)%41,y=21+H(i,6)%26
  crack(p,[[32,52],[26+H(i,8)%13,42],[x,y]],i%3?K.wood:K.ink)
  if(i%3===0)block(p,x,y,5,3,K.canvasHi)
 }
}
function prickly(p){
 shadow(p,32,56,22,5)
 for(const [x,y,rx,ry] of [[22,43,13,12],[37,36,12,16],[45,47,11,11]]){
  oval(p,x,y,rx+2,ry+2,K.ink)
  oval(p,x,y,rx,ry,K.greenDeep)
  oval(p,x-2,y-2,rx-3,ry-3,K.green)
  oval(p,x-4,y-4,5,5,K.greenHi)
  for(let k=0;k<6;k++){const px0=x-8+H(k,y)%16,py0=y-9+H(k,x)%18;px(p,px0,py0,K.cream)}
 }
 for(const [x,y] of [[18,32],[33,20],[44,33]]){block(p,x,y,5,4,K.roofHi);block(p,x+1,y-2,3,2,K.canvasHi)}
}
export const styledBiomeProps={
 'desert-cactus':p=>cactus(p),
 'desert-cactus-small':p=>cactus(p,true),
 'desert-rock':rock,
 'desert-house':p=>house(p,'house'),
 'desert-tent':p=>house(p,'tent'),
 'desert-temple':p=>house(p,'temple'),
 'snow-pine':pine,
 'desert-agave':agave,
 'desert-shrub':shrub,
 'desert-prickly-pear':prickly
}
