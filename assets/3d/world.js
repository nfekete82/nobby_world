import * as THREE from '../vendor/three.module.js';

// The simulation keeps its saved world coordinates. One metre = 100 game units.
const U=.01, TAU=Math.PI*2;
const palette={grass:0x85b35d,deepGrass:0x548547,wood:0x805536,bark:0x77533a,stone:0xa5af9a,blue:0x325f91,gold:0xe6bb64,skin:0xeac397,ink:0x263a3c};
const materials=new Map(),geometries=new Map();
const material=(color,options={})=>{const k=JSON.stringify([color,options]);if(!materials.has(k))materials.set(k,new THREE.MeshStandardMaterial({color,roughness:.83,...options}));return materials.get(k);};
const sphere=()=>{if(!geometries.has('sphere'))geometries.set('sphere',new THREE.SphereGeometry(1,16,12));return geometries.get('sphere');};
const box=()=>{if(!geometries.has('box'))geometries.set('box',new THREE.BoxGeometry(1,1,1));return geometries.get('box');};
const cylinder=()=>{if(!geometries.has('cylinder'))geometries.set('cylinder',new THREE.CylinderGeometry(.8,1,1,10));return geometries.get('cylinder');};
function mesh(parent,geo,color,pos=[0,0,0],scale=[1,1,1],options={}){const m=new THREE.Mesh(geo,typeof color==='object'?color:material(color,options));m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const ball=(parent,color,pos,scale,options)=>mesh(parent,sphere(),color,pos,scale,options);
const block=(parent,color,pos,scale,options)=>mesh(parent,box(),color,pos,scale,options);
function rod(parent,a,b,r,color){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start);const m=mesh(parent,cylinder(),color,start.clone().add(end).multiplyScalar(.5).toArray(),[r,d.length(),r]);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
function ring(parent,r,t,color,pos,rotate=true){const m=mesh(parent,new THREE.TorusGeometry(r,t,8,36),color,pos);if(rotate)m.rotation.x=-Math.PI/2;return m;}
function seeded(n){let v=n>>>0;return()=>{v=(1664525*v+1013904223)>>>0;return v/4294967296;};}
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

function face(parent,{skin=palette.skin,eyes=palette.ink,beard=false,angry=false}={}){
 const head=new THREE.Group();parent.add(head);head.position.y=.99;
 ball(head,skin,[0,0,0],[.235,.255,.22]);
 for(const x of [-.245,.245])ball(head,skin,[x,-.025,0],[.055,.078,.055]);
 ball(head,skin,[0,-.025,.221],[.049,.055,.045]);
 for(const x of [-.086,.086]){
  ball(head,0xfffbdf,[x,.025,.201],[.065,.083,.028]);
  ball(head,eyes,[x,.014,.229],[.035,.055,.017]);
  ball(head,0xffffff,[x-.01,.036,.243],[.011,.016,.007]);
  const brow=block(head,0x4e3428,[x,.118,.207],[.105,.027,.026]);brow.rotation.z=(x<0?1:-1)*(angry?.26:.09);
 }
 if(beard){ball(head,0x69432c,[0,-.153,.165],[.151,.093,.085]);ball(head,skin,[0,-.105,.224],[.078,.033,.02]);}
 else ball(head,0xae735a,[0,-.117,.21],[.043,.013,.012]);
 return head;
}
function hair(head){
 ball(head,0x593a28,[0,.13,-.015],[.25,.2,.23]);
 const locks=[[-.19,.13,.13],[-.13,.22,.12],[-.035,.27,.09],[.065,.25,.08],[.16,.21,.06],[.21,.12,-.04],[-.19,.08,-.12]];
 locks.forEach(([x,y,z],i)=>{const m=ball(head,i%2?0x8d5e37:0x76502f,[x,y,z],[.115,.13,.10]);m.rotation.z=-.65;const tip=mesh(head,new THREE.ConeGeometry(.095,.2,6),0x76502f,[x+.045,y+.10,z],[1,1,.85]);tip.rotation.z=-.6;});
}
function humanoid(kind='hero'){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const hero=kind==='hero',merchant=kind==='merchant',goblin=kind==='goblin';
 const blue=hero?0x315b85:merchant?0xae8039:goblin?0x716443:0xb87e42;
 const skin=goblin?0x91b15d:palette.skin;
 const legs=[];
 for(const x of [-.105,.105]){const leg=new THREE.Group();leg.position.set(x,.31,0);body.add(leg);rod(leg,[0,0,0],[0,-.20,0],.065,0x645347);ball(leg,0x5c4232,[0,-.23,.045],[.087,.085,.14]);legs.push(leg);}
 mesh(body,new THREE.CylinderGeometry(.16,.25,.45,12),blue,[0,.49,0]);
 if(hero){
  const cape=mesh(body,new THREE.CylinderGeometry(.13,.30,.52,12,1,true,0,Math.PI*1.35),0x253e66,[0,.52,-.07]);cape.rotation.y=Math.PI*.33;
  ring(body,.249,.018,palette.gold,[0,.275,0]);
 }
 ring(body,.202,.026,0x5c4332,[0,.49,0]);block(body,palette.gold,[0,.49,.207],[.09,.085,.025]);
 const collar=ring(body,.171,.025,palette.gold,[0,.715,0]);
 const arms=[];
 for(const x of [-.225,.225]){const arm=new THREE.Group();arm.position.set(x,.66,0);body.add(arm);ball(arm,blue,[0,-.025,0],[.105,.12,.1]);rod(arm,[0,-.04,0],[0,-.25,.03],.069,blue);ball(arm,skin,[0,-.28,.04],[.07,.08,.07]);arms.push(arm);}
 const head=face(body,{skin,beard:hero||merchant,angry:goblin});
 if(hero)hair(head);
 else if(merchant||kind==='raider'){
  ball(head,blue,[0,.10,-.075],[.265,.23,.23]);
  // Hood frames an uncovered face; its opening is geometric, not a billboard.
  const hood=ring(head,.23,.055,blue,[0,.018,.02],false);hood.scale.y=1.18;
  if(merchant){ball(head,0xdedbd0,[0,-.18,.18],[.17,.16,.10]);ball(head,skin,[0,-.09,.23],[.1,.047,.024]);}
 }else if(goblin){
  for(const x of [-1,1]){const ear=mesh(head,new THREE.ConeGeometry(.10,.32,5),skin,[x*.29,.045,0]);ear.rotation.z=-x*1.1;}
  ball(head,0x4f753f,[0,.18,-.06],[.23,.12,.2]);
 }
 const weapon=new THREE.Group();weapon.position.set(.30,.18,.06);body.add(weapon);
 let crystal=null;
 if(hero){
  rod(weapon,[0,0,0],[.035,1.12,0],.026,0x805b38);
  for(const a of [-.09,.09])rod(weapon,[.025,.98,0],[a,1.16,0],.018,palette.gold);
  crystal=mesh(weapon,new THREE.OctahedronGeometry(.12),material(0x70e4ed,{emissive:0x2bafdb,emissiveIntensity:.55,metalness:.25,roughness:.2}),[.025,1.18,0],[.75,1.45,.75]);
 }else if(goblin){rod(weapon,[0,0,0],[0,1.12,0],.022,palette.wood);mesh(weapon,new THREE.ConeGeometry(.07,.24,4),0xc6d2c9,[0,1.2,0]);}
 else if(kind==='raider'){
  const curve=new THREE.EllipseCurve(0,0,.22,.40,-Math.PI/2,Math.PI/2,false,0);
  const pts=curve.getPoints(20).map(p=>new THREE.Vector3(p.x,p.y+.55,0));
  mesh(weapon,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),20,.025,6,false),palette.wood);
  rod(weapon,[0,.15,0],[0,.95,0],.006,0xe5d5ad);
  rod(body,[-.19,.40,-.13],[.08,.89,-.24],.09,0x60442c);
  for(let i=0;i<3;i++)rod(body,[-.13+i*.035,.70,-.23],[-.13+i*.035,1.01,-.23],.009,0xbba77b);
 }else if(merchant){ball(body,0x6b5036,[-.28,.42,-.03],[.17,.22,.12]);ring(body,.14,.018,palette.gold,[-.28,.45,.09],false);}
 root.userData.rig={body,head,legs,arms,weapon,crystal};return root;
}
function slime(){
 const g=new THREE.Group();ball(g,material(0xaa7bcb,{roughness:.28,metalness:.05}),[0,.29,0],[.39,.31,.34]);
 for(const x of [-.13,.13]){ball(g,0x32253f,[x,.33,.292],[.043,.067,.022]);ball(g,0xffffff,[x-.01,.35,.313],[.013,.021,.009]);}
 ball(g,0x704763,[0,.20,.32],[.055,.025,.015]);ball(g,0xe3c7ec,[-.14,.47,.13],[.09,.025,.07]);return g;
}
function scarab(){
 const g=new THREE.Group();ball(g,0x6f8170,[0,.27,0],[.31,.22,.39]);
 for(const x of [-.13,.13])ball(g,material(0xb49a4e,{metalness:.45,roughness:.4}),[x,.35,-.02],[.16,.17,.30]);
 ball(g,0x8c733e,[0,.22,.35],[.18,.16,.17]);
 for(const x of [-.075,.075])ball(g,0xeedd89,[x,.27,.48],[.027,.033,.02]);
 for(const side of [-1,1])for(let j=0;j<3;j++){const z=-.22+j*.23;rod(g,[side*.23,.22,z],[side*.43,.18,z+.08],.025,0x685638);rod(g,[side*.43,.18,z+.08],[side*.49,.025,z+.16],.02,0x685638);}return g;
}
function treant(boss=false){
 const g=new THREE.Group();
 mesh(g,new THREE.CylinderGeometry(.29,.44,1.15,9),0x79573d,[0,.93,0]);
 for(const x of [-1,1]){
  rod(g,[x*.26,.55,0],[x*.38,.10,.12],.12,0x74553d);rod(g,[x*.38,.10,.12],[x*.52,.055,.29],.09,0x74553d);
  rod(g,[x*.30,1.27,0],[x*.62,.87,.06],.15,0x79573d);rod(g,[x*.62,.87,.06],[x*.63,.51,.20],.18,0x79573d);
  for(let i=0;i<3;i++)rod(g,[x*.63,.55,.16+i*.06],[x*(.60+i*.04),.38,.22+i*.04],.047,0x79573d);
 }
 ball(g,0x806040,[0,1.61,0],[.38,.39,.32]);
 for(const x of [-.14,.14]){ball(g,material(0xffd37b,{emissive:0xf4a63c,emissiveIntensity:.7}),[x,1.53,.365],[.09,.065,.035]);const brow=rod(g,[x-.11,1.65,.36],[x+.11,1.61,.36],.035,0x5b5038);}
 for(let i=0;i<8;i++){const a=i/8*TAU;ball(g,i%2?0x6d994b:0x4e8047,[Math.cos(a)*.31,1.9+Math.sin(a*3)*.07,Math.sin(a)*.24],[.27,.19,.23]);}
 for(const x of [-1,1]){rod(g,[x*.25,1.89,0],[x*.4,2.30,-.03],.065,0x79573d);rod(g,[x*.4,2.16,-.03],[x*.62,2.31,-.03],.04,0x79573d);}
 if(boss){ring(g,.27,.037,palette.gold,[0,2.13,0]);for(let i=0;i<5;i++){const a=i/5*TAU;mesh(g,new THREE.ConeGeometry(.067,.26,4),palette.gold,[Math.cos(a)*.25,2.27,Math.sin(a)*.25]);}ball(g,material(0xf2cb67,{emissive:0xd58525,emissiveIntensity:.12,metalness:.35}),[0,1.05,.35],[.14,.19,.03]);ring(g,.13,.022,palette.gold,[0,1.05,.395],false);mesh(g,new THREE.OctahedronGeometry(.065),0xb6d8bd,[0,1.05,.42],[.65,1,.4]);}
 g.scale.setScalar(boss?1.55:1.1);return g;
}

const southPath=(x,s)=>s.pathAt(x)+2450;
class World3D{
 constructor(input,state){
  this.input=input;this.state=state;this.static=new THREE.Group();this.actors=new Map();this.pickMeshes=[];this.surfaces=[];this.occludingTrees=[];this.effects=new THREE.Group();this.lastTime=state.time;this.currentWorldLevel=state.worldRun.level;this.ready=false;
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;
  const canvas=this.renderer.domElement;canvas.id='scene-3d';canvas.setAttribute('aria-label','Dreidimensionale Spielwelt Nobby World');input.before(canvas);
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xbacfc2);this.scene.fog=new THREE.FogExp2(0xc4d4b9,.013);
  this.scene.add(this.static,this.effects);
  this.camera=new THREE.OrthographicCamera(-8,8,5.5,-5.5,.1,100);
  this.camera.position.set(state.hero.x*U,14,state.hero.y*U+12);this.target=new THREE.Vector3(state.hero.x*U,0,state.hero.y*U);
  this.scene.add(new THREE.HemisphereLight(0xf4f4ce,0x73997f,1.25));
  this.sun=new THREE.DirectionalLight(0xffedbd,2.5);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.left=-11;this.sun.shadow.camera.right=11;this.sun.shadow.camera.top=11;this.sun.shadow.camera.bottom=-11;this.sun.shadow.camera.near=.5;this.sun.shadow.camera.far=60;this.sun.shadow.bias=-.0005;this.sun.shadow.normalBias=.025;this.sun.shadow.radius=3;
  this.scene.add(this.sun,this.sun.target);
  this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();
  this.textures={};this.buildTerrain(state);this.buildWater(state);this.buildMountains(state);this.buildTrees(state);this.buildDetails(state);this.buildVillage(state);this.buildBridge(state);this.buildLandmarks(state);this.buildPortal();
  this.hero=humanoid();this.scene.add(this.hero);this.hero.userData.actor='hero';
  this.merchant=humanoid('merchant');this.place(this.merchant,state.merchant.x,state.merchant.y);this.scene.add(this.merchant);this.registerActor(this.merchant,{merchant:true});
  for(const m of state.enemies){const model=m.kind==='slime'?slime():m.kind==='scarab'?scarab():m.kind==='elite'||m.kind==='boss'?treant(m.kind==='boss'):humanoid(m.kind);if(m.variant){const tint=m.variant==='crystal'?0x9cd5e1:m.variant==='dusk'?0x9dabc9:m.variant==='sand'?0xd9bd85:0xb2c5a5;model.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.lerp(new THREE.Color(tint),m.variant==='crystal'?.40:.24);}});}
   this.scene.add(model);this.actors.set(m.id,model);this.registerActor(model,{enemy:m});
   const frost=new THREE.Group();const halo=ring(frost,.43,.016,material(0xc2edf1,{emissive:0x6aafce,emissiveIntensity:.5}),[0,.055,0]);
   for(let i=0;i<5;i++){const a=i/5*TAU;mesh(frost,new THREE.OctahedronGeometry(.06),0xc2e8ee,[Math.cos(a)*.4,.14,Math.sin(a)*.4],[.5,1.6,.5]);}
   frost.visible=false;model.add(frost);model.userData.frost=frost;
}
  this.buildEffectPool();this.loadMaterials();
  this.resize();this.ready=true;input.style.opacity='0';document.getElementById('render-status').textContent='';
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.getElementById('render-status').textContent='3D-Grafik pausiert · Bitte neu laden';});
 }
 registerActor(model,value){model.traverse(o=>{if(o.isMesh){o.userData.pick=value;this.pickMeshes.push(o);}});}
 height(x,y){
  const s=this.state;
  if(Math.abs(x-s.riverCenter(y))<95&&s.river.bridges.some(by=>Math.abs(y-by)<77))return .14;
  for(const hill of s.plateaus){const band=s.plateauBand(hill,Math.max(hill.x,Math.min(hill.x+hill.w-.1,x)));if(Math.abs(x-hill.stairsX)<hill.stairsWidth/2&&y>band.lip-40&&y<band.lip+100)return (1-smooth(band.lip-40,band.lip+100,y))*.90;}
  return s.heightAt(x,y)? .90:0;
 }
 place(o,x,y){o.position.set(x*U,this.height(x,y),y*U);}
 resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h,false);const half=h<650?5.2:5.6,aspect=w/h;this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();this.width=w;this.heightPixels=h;}
 makeTerrainGeometry(s){
  const nx=Math.ceil(s.WORLD.w/20),nz=Math.ceil(s.WORLD.h/20),positions=[],uv=[],colors=[],indices=[];
  const sand=new THREE.Color(0xffffff),grass=new THREE.Color(0xf5f5e4);
  for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++){
   const wx=x*s.WORLD.w/nx,wz=z*s.WORLD.h/nz;const river=Math.abs(wx-s.riverCenter(wz))<s.river.width*.55;
   const lake=s.lakeContains(wx,wz,10);const y=lake||river?-.18:0;
   positions.push(wx*U,y,wz*U);uv.push(wx/220,wz/220);
   const shade=.95+.045*Math.sin(wx/71)*Math.sin(wz/83);const color=grass.clone().lerp(sand,smooth(3100,4050,wx)*(1-smooth(6000,6400,wx))).multiplyScalar(shade);colors.push(color.r,color.g,color.b);
   if(x<nx&&z<nz){const i=z*(nx+1)+x;indices.push(i,i+nx+1,i+1,i+1,i+nx+1,i+nx+2);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
 }
 buildTerrain(s){
  this.groundMaterial=new THREE.MeshStandardMaterial({color:0x91b765,roughness:1,vertexColors:true});
  this.ground=mesh(this.static,this.makeTerrainGeometry(s),this.groundMaterial);this.ground.castShadow=false;
  this.ground.userData.ground=true;this.surfaces.push(this.ground);
  this.dirtMaterial=material(0xc0a681,{roughness:1});this.roadMaterials=[material(0x8b9b59),material(0xacb17b),this.dirtMaterial];
  for(const p of s.worldPaths){for(const [radius,mat,y]of [[p.width+14,this.roadMaterials[0],.005],[p.width+6,this.roadMaterials[1],.009],[p.width,this.dirtMaterial,.014]])this.ribbon(p.points,radius,mat,y,true);}
  this.ribbon([[s.start.x-420,s.pathAt(s.start.x-420)],[s.start.x-400,s.pathAt(s.start.x-400)-100],[s.start.x-200,s.pathAt(s.start.x-200)-140],[s.start.x+110,s.pathAt(s.start.x+110)-115]],40,this.dirtMaterial,.018,false);
 }
 ribbon(points,radius,mat,height,avoidWater){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],0,p[1])));const count=Math.max(30,points.length),pos=[],uv=[],idx=[];
  for(let i=0;i<=count;i++){const p=curve.getPoint(i/count),t=curve.getTangent(i/count);const r=radius+Math.sin(i*.67)*4+Math.sin(i*.21)*3;for(const sign of [-1,1]){const x=p.x-t.z*r*sign,z=p.z+t.x*r*sign;pos.push(x*U,height,z*U);uv.push(x/160,z/160);}if(i<count){const mid=curve.getPoint((i+.5)/count);if(!avoidWater||!this.state.riverContains(mid.x,mid.z,0)){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  let roadMat=mat;if(mat!==this.dirtMaterial){roadMat=mat.clone();roadMat.vertexColors=true;roadMat.color.set(0xffffff);const colors=[],forest=mat.color,desert=new THREE.Color(mat===this.roadMaterials[0]?0xb6a072:0xcdba87);for(let i=0;i<pos.length;i+=3){const c=forest.clone().lerp(desert,smooth(31,40.5,pos[i]));colors.push(c.r,c.g,c.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));}
  const m=mesh(this.static,g,roadMat);m.castShadow=false;return m;
 }
 waterMaterial(){
  const m=new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:`varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 p;uniform float uTime;void main(){float a=sin(p.x*12.+p.z*7.+uTime*.7)*sin(p.z*17.-uTime*.6+p.x*3.);float b=sin(p.x*34.+sin(p.z*13.)+uTime)*sin(p.z*27.-uTime*.8);float foam=smoothstep(.90,.99,a)*.32+smoothstep(.94,.995,b)*.2;vec3 c=mix(vec3(.035,.22,.25),vec3(.085,.38,.35),.5+.2*a);c=mix(c,vec3(.85,.95,.84),foam);gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,side:THREE.DoubleSide});this.waterShader=m;return m;
 }
 lakeContour(lake,margin=0){const s=this.state,cx=lake.x+lake.cols*115/2,cz=lake.y+lake.rows*115/2,rx=lake.cols*115/2-24+margin,rz=lake.rows*115/2-24+margin;const points=[];for(let i=0;i<72;i++){const a=i/72*TAU,r=s.lakeRadius(lake,a);points.push(new THREE.Vector2((cx+Math.cos(a)*rx*r)*U,(cz+Math.sin(a)*rz*r)*U));}return points;}
 flatShape(points,mat,height){const shape=new THREE.Shape(points);const g=new THREE.ShapeGeometry(shape);const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);p.setXYZ(i,p.getX(i),height,y);}const ix=g.index;for(let i=0;i<ix.count;i+=3){const b=ix.getX(i+1);ix.setX(i+1,ix.getX(i+2));ix.setX(i+2,b);}g.computeVertexNormals();const u=g.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,u.getX(i)/2.2,u.getY(i)/2.2);const m=mesh(this.static,g,mat);m.castShadow=false;return m;}
 buildWater(s){
  const water=this.waterMaterial(),shore=material(0xbdbf91),edge=material(0xe1dbad);this.waterObjects=[];
  for(const lake of s.lakes){this.flatShape(this.lakeContour(lake,18),shore,.018);this.flatShape(this.lakeContour(lake,5),edge,.022);const m=this.flatShape(this.lakeContour(lake,0),water,.027);this.waterObjects.push(m);const contour=this.lakeContour(lake,22);for(let i=0;i<contour.length;i+=4){const p=contour[i];if(i%12!==0)this.rock(p.x,p.y,.16+(i%3)*.05,i);}
   const cx=(lake.x+lake.cols*115/2)*U,cz=(lake.y+lake.rows*115/2)*U;for(let i=0;i<4;i++){const x=cx+Math.cos(i*2.2)*.65,z=cz+Math.sin(i*2.2)*.7;const pad=mesh(this.static,new THREE.CylinderGeometry(.13,.13,.015,18,1,false,.2,TAU-.38),0x7eac5c,[x,.045,z]);if(i%2===0){for(let j=0;j<5;j++){const a=j/5*TAU;ball(this.static,0xe7a6bd,[x+Math.cos(a)*.045,.10,z+Math.sin(a)*.045],[.04,.045,.025]);}ball(this.static,0xf1dc88,[x,.12,z],[.025,.02,.025]);}}
  }
  const banks=[],waters=[];for(let z=0;z<=s.WORLD.h;z+=20){const x=s.riverCenter(z);banks.push(new THREE.Vector2((x-s.river.width/2-14)*U,z*U));waters.push(new THREE.Vector2((x-s.river.width/2)*U,z*U));}for(let z=s.WORLD.h;z>=0;z-=20){const x=s.riverCenter(z);banks.push(new THREE.Vector2((x+s.river.width/2+14)*U,z*U));waters.push(new THREE.Vector2((x+s.river.width/2)*U,z*U));}
  this.flatShape(banks,edge,.022);this.waterObjects.push(this.flatShape(waters,water,.029));
  for(let z=80;z<s.WORLD.h;z+=95){if(s.river.bridges.some(by=>Math.abs(z-by)<110))continue;for(const sign of [-1,1]){const x=(s.riverCenter(z)+sign*(s.river.width/2+20))*U;this.rock(x,z*U,.15+((z%3)*.05),z);}}
 }
 buildMountains(s){
  for(const hill of s.plateaus){
   const outline=[];for(let i=0;i<=36;i++){const x=hill.x+hill.w*i/36,b=s.plateauBand(hill,Math.min(hill.x+hill.w-.01,x));outline.push(new THREE.Vector2(x*U,b.top*U));}for(let i=36;i>=0;i--){const x=hill.x+hill.w*i/36,b=s.plateauBand(hill,Math.min(hill.x+hill.w-.01,x));outline.push(new THREE.Vector2(x*U,b.lip*U));}
   const topMat=material(hill.x<3100?0x86ae60:0xb6ac78).clone();this.plateauMaterials??=[];this.plateauMaterials.push(topMat);this.surfaces.push(this.flatShape(outline,topMat,.90));
   const pos=[],uv=[],idx=[];for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length],n=pos.length/3;pos.push(a.x,0,a.y,b.x,0,b.y,a.x,.90,a.y,b.x,.90,b.y);uv.push(0,0,1,0,0,1,1,1);idx.push(n,n+2,n+1,n+1,n+2,n+3);}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();this.cliffMaterial??=material(0xa7a18b,{side:THREE.DoubleSide});mesh(this.static,g,this.cliffMaterial);
   const band=s.plateauBand(hill,hill.stairsX);for(let i=0;i<9;i++){const z=(band.lip+95-i*15)*U;this.surfaces.push(block(this.static,0xb3b59e,[hill.stairsX*U,(i+1)*.05,z],[hill.stairsWidth*U,(i+1)*.1,.16]));block(this.static,0x859078,[hill.stairsX*U,(i+1)*.1+.008,z+.075],[hill.stairsWidth*U,.016,.02]);}
   for(let i=0;i<outline.length;i+=2){const p=outline[i];if(Math.abs(p.x-hill.stairsX*U)<hill.stairsWidth*U/2+.2&&p.y>band.lip*U-.3)continue;for(let level=0;level<3;level++){this.rockGeo??=new THREE.DodecahedronGeometry(1,0);this.instance(this.rockGeo,material(level%2?0xa2a98f:0xb3b49a),[p.x,.18+level*.29,p.y],[.24,.20,.18],[0,i*.7,0]);}}

  }
 }
 instance(geo,mat,pos,scale,rotation=[0,0,0]){
  this.instanceBatches??=new Map();const sector=Math.floor(pos[0]/6)+':'+Math.floor(pos[2]/6);const key=geo.uuid+mat.uuid+sector;if(!this.instanceBatches.has(key))this.instanceBatches.set(key,{geo,mat,list:[]});const o=new THREE.Object3D();o.position.set(...pos);o.scale.set(...scale);o.rotation.set(...rotation);o.updateMatrix();this.instanceBatches.get(key).list.push(o.matrix.clone());
 }
 flushInstances(){if(!this.instanceBatches)return;for(const b of this.instanceBatches.values()){const inst=new THREE.InstancedMesh(b.geo,b.mat,b.list.length);b.list.forEach((m,i)=>inst.setMatrixAt(i,m));inst.castShadow=true;inst.receiveShadow=true;inst.computeBoundingSphere();this.static.add(inst);}this.instanceBatches.clear();}
 canopyGeometry(){
  if(this.canopyGeo)return this.canopyGeo;
  this.canopyGeo=new THREE.SphereGeometry(1,16,12);const p=this.canopyGeo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=1+.045*Math.sin(x*21+z*7)*Math.sin(y*19-z*12)+.025*Math.cos(x*35+y*25);p.setXYZ(i,x*n,y*n,z*n);}
  this.canopyGeo.computeVertexNormals();return this.canopyGeo;
 }
 buildTrees(s){
  const rng=seeded(617),bark=material(0x7e5d3c),trunk=material(0x8f6c46);const greens=[material(0x588749),material(0x6d9b4c),material(0x83ac57),material(0x477849)];this.leafMaterials=[...greens];this.barkMaterials=[bark,trunk];
  for(const t of s.trees){const x=t.x*U,z=t.y*U,k=t.scale*.88,base=this.height(t.x,t.y);const treeGreens=greens.map(m=>{const c=m.clone();c.transparent=true;return c;});this.leafMaterials.push(...treeGreens);this.occludingTrees.push({tree:t,materials:treeGreens,alpha:1});this.instance(cylinder(),trunk,[x,base+.68*k,z],[.15*k,1.38*k,.15*k]);
   for(let j=0;j<5;j++){const a=j/5*TAU;this.instance(sphere(),bark,[x+Math.cos(a)*.12*k,base+.09*k,z+Math.sin(a)*.12*k],[.23*k,.08*k,.10*k],[0,-a,0]);}
   const pine=t.kind==='pine';
   if(pine){
    for(let j=0;j<4;j++){const y=1.25+j*.47,r=.85-j*.16;const geo=new THREE.ConeGeometry(r*k,1.08*k,9);this.instance(geo,treeGreens[j%3],[x,base+y*k,z],[1,1,1],[0,t.wind,0]);for(let q=0;q<5;q++){const a=q/5*TAU;this.instance(this.canopyGeometry(),treeGreens[(j+q)%4],[x+Math.cos(a)*r*.46*k,base+(y-.3)*k,z+Math.sin(a)*r*.46*k],[r*.52*k,.26*k,r*.45*k]);}}
   }else{
    for(let j=0;j<10;j++){const a=j/10*TAU,r=(j%3===0?.60:.72)*k;const y=(1.80+.22*Math.sin(a*3))*k;this.instance(this.canopyGeometry(),treeGreens[j%4],[x+Math.cos(a)*r,base+y,z+Math.sin(a)*r],[.66*k,.55*k,.61*k]);}
    for(let j=0;j<4;j++){const a=j/4*TAU;this.instance(this.canopyGeometry(),treeGreens[(j+1)%3],[x+Math.cos(a)*.34*k,base+2.38*k,z+Math.sin(a)*.30*k],[.59*k,.51*k,.56*k]);}
   }
  }
  this.flushInstances();
 }
 rock(x,z,size,seed=0){
  const rand=seeded(seed+87);this.rockGeo??=new THREE.DodecahedronGeometry(1,0);this.instance(this.rockGeo,material([0xa9b19b,0xbfc1a7,0x929f8d][seed%3]??0xa9b19b),[x,this.height(x/U,z/U)+size*.32,z],[size,size*(.65+rand()*.45),size*.8],[rand()*.4,rand()*TAU,rand()*.25]);
 }
 buildDetails(s){
  const rng=seeded(99531),grass=material(0x7dac58,{side:THREE.DoubleSide}),moonGrass=material(0x7399a5,{side:THREE.DoubleSide});
  const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.05,0,0,.05,0,0,-.018,.16,.018,.018,.16,.018,.04,.29,.04],3));blade.setIndex([0,1,2,1,3,2,2,3,4]);blade.computeVertexNormals();
  for(let i=0;i<12500;i++){const x=rng()*s.WORLD.w,z=rng()*s.WORLD.h;if((s.biomeAt(x)!=='forest'&&s.biomeAt(x)!=='dusk')||s.onWorldPath(x,z,20)||s.lakeContains(x,z,28)||s.riverContains(x,z,35))continue;const k=.5+rng()*.7;this.instance(blade,s.biomeAt(x)==='dusk'?moonGrass:grass,[x*U,this.height(x,z)+.015,z*U],[k,k,k],[0,rng()*TAU,0]);}
  for(const o of s.rocks)this.rock(o.x*U,o.y*U,o.s*.019,Math.floor(o.x));
  for(const o of s.details){
   if(s.lakeContains(o.x,o.y,35)||s.riverContains(o.x,o.y,35))continue;
   const x=o.x*U,z=o.y*U,h=this.height(o.x,o.y),k=o.type==='cactus'?.9:o.s*.025;
   if(o.type==='crystal'){
    this.crystalGeometry??=new THREE.OctahedronGeometry(1);for(let j=0;j<3;j++){const dx=(j-1)*.16,sy=.32+(j%2)*.30;this.instance(this.crystalGeometry,material(j%2?0xa5d4dd:0x7fb4c7,{emissive:0x377c91,emissiveIntensity:.25,metalness:.15,roughness:.35}),[x+dx,h+sy*.55,z+(j%2)*.12],[.11,sy,.12],[0,j*.7,.12*(j-1)]);}
   }else if(o.type==='cactus'){
    this.instance(cylinder(),material(0x6c9872),[x,h+.39*k,z],[.115*k,.78*k,.115*k]);this.instance(sphere(),material(0x6c9872),[x,h+.78*k,z],[.105*k,.12*k,.105*k]);for(const sign of [-1,1]){this.instance(sphere(),material(0x6c9872),[x+sign*.19*k,h+.37*k,z],[.20*k,.07*k,.07*k]);this.instance(cylinder(),material(0x6c9872),[x+sign*.29*k,h+.5*k,z],[.07*k,.29*k,.07*k]);}
   }else if(o.type==='drybush'){
    for(let i=0;i<5;i++){const a=i/5*TAU;this.instance(cylinder(),material(0xb49a67),[x+Math.cos(a)*.1,h+.12,z+Math.sin(a)*.1],[.022,.29,.022],[Math.sin(a)*.4,0,Math.cos(a)*.4]);}
   }else{
    for(let i=0;i<6;i++){const a=i/6*TAU;this.instance(sphere(),material(i%2?0x7fa855:0x54884d),[x+Math.cos(a)*k*.5,h+.12,z+Math.sin(a)*k*.5],[k*.62,.12,k*.22],[0,-a,0]);}
    if(o.type==='flowers')for(let i=0;i<6;i++){const a=i/6*TAU;this.flower(x+Math.cos(a)*.15,z+Math.sin(a)*.15,h,i%2?0xeecb6b:0xc2a4d1,.8);}
   }
  }
  // Deliberately placed flower borders frame the bridge and village paths.
  for(let i=0;i<36;i++){const z=s.river.bridgeY-110-rng()*260,x=s.riverCenter(z)+(i%2?1:-1)*(85+rng()*75);if(!s.lakeContains(x,z,20))this.flower(x*U,z*U,0,[0xf2cd65,0xcda6d8,0xefe7c4][i%3],1.05);}
  this.flushInstances();
 }
 flower(x,z,h,color,k=1){
  this.instance(cylinder(),material(0x6d9252),[x,h+.10*k,z],[.012*k,.2*k,.012*k]);for(let j=0;j<5;j++){const a=j/5*TAU;this.instance(sphere(),material(color),[x+Math.cos(a)*.042*k,h+.21*k,z+Math.sin(a)*.042*k],[.042*k,.021*k,.025*k],[0,-a,0]);}this.instance(sphere(),material(0xe5bb58),[x,h+.23*k,z],[.025*k,.018*k,.025*k]);
 }
 building(x,z,type='cottage'){
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.y=1.15;this.static.add(g);
  const width=type==='smith'?2.2:1.95,depth=1.65;
  block(g,0x9ea18b,[0,.16,0],[width+.12,.32,depth+.12]);block(g,0xe6d4a7,[0,.91,0],[width,1.20,depth]);
  for(const xx of [-width/2,width/2])for(const zz of [-depth/2,depth/2])block(g,palette.wood,[xx,.95,zz],[.115,1.4,.115]);
  for(const y of [.36,1.42])block(g,palette.wood,[0,y,depth/2+.025],[width,.09,.10]);
  for(const xx of [-.53,.53]){block(g,0x705139,[xx,.96,depth/2+.04],[.46,.46,.08]);block(g,material(0xffd993,{emissive:0xf2bd60,emissiveIntensity:.35}),[xx,.97,depth/2+.09],[.36,.35,.02]);for(const yy of [.97])block(g,palette.wood,[xx,yy,depth/2+.11],[.37,.025,.03]);block(g,palette.wood,[xx,.97,depth/2+.11],[.025,.36,.03]);}
  block(g,0x765238,[0,.85,depth/2+.065],[.55,1.1,.09]);for(let i=0;i<4;i++)block(g,0x8f6540,[-.15+i*.1,.73,depth/2+.12],[.014,.70,.01]);ball(g,palette.gold,[.13,.75,depth/2+.13],[.027,.027,.027]);
  for(let i=0;i<3;i++)block(g,0xb6b69b,[0,.06+i*.05,depth/2+.43-i*.11],[.65,.12,.34]);
  const roof=new THREE.Shape();roof.moveTo(-width*.6,1.48);roof.lineTo(0,2.22);roof.lineTo(width*.6,1.48);roof.closePath();const rg=new THREE.ExtrudeGeometry(roof,{depth:depth+.34,bevelEnabled:false});mesh(g,rg,type==='smith'?0x536f7a:0x456f99,[0,0,-depth/2-.17]);
  const roofColor=type==='smith'?0x677d83:0x5b86af;
  for(const side of [-1,1])for(let row=0;row<5;row++)for(let col=0;col<7;col++){
   const xx=side*(row+.5)*width*.12,yy=2.24-(row+.5)*.148,zz=-depth/2-.12+col*(depth+.25)/6;
   const tile=block(g,(row+col)%3?roofColor:type==='smith'?0x536f7a:0x47769f,[xx,yy,zz],[width*.14,.055,.29]);tile.rotation.z=-side*Math.atan(.74/(width*.6));
  }
  rod(g,[-width*.61,1.49,depth/2+.19],[0,2.24,depth/2+.19],.045,palette.wood);rod(g,[0,2.24,depth/2+.19],[width*.61,1.49,depth/2+.19],.045,palette.wood);rod(g,[0,2.24,-depth/2-.19],[0,2.24,depth/2+.19],.045,palette.wood);
  block(g,0xa6a68f,[.55,1.98,-.35],[.35,.85,.35]);block(g,0xc0bda5,[.55,2.42,-.35],[.43,.12,.43]);
  for(let i=0;i<12;i++){const a=i/12*TAU;ball(g,0xb5b59a,[Math.cos(a)*width*.49,.13,Math.sin(a)*depth*.5],[.18,.12,.15]);}
  if(type==='smith'){
   block(g,0x8e8e7b,[-1.20,.37,.47],[.7,.74,.65]);block(g,0x3e4a49,[-1.20,.41,.81],[.46,.35,.035]);ball(g,material(0xffb85e,{emissive:0xff7a29,emissiveIntensity:1}),[-1.2,.38,.84],[.18,.12,.02]);
   block(g,0x6b5140,[1.05,.22,.85],[.42,.44,.4]);block(g,0x56686b,[1.05,.53,.85],[.62,.14,.28]);mesh(g,new THREE.ConeGeometry(.16,.35,4),0x56686b,[1.34,.53,.85],[1,1,1]).rotation.z=-Math.PI/2;
  }
  return g;
 }
 buildVillage(s){
  const cottageX=s.start.x-480,smithX=s.start.x-160;this.building(cottageX*U,(s.pathAt(cottageX)-210)*U);this.building(smithX*U,(s.pathAt(smithX)-230)*U,'smith');
  const x=(s.merchant.x+45)*U,z=(s.merchant.y-105)*U,g=new THREE.Group();g.position.set(x,0,z);this.static.add(g);
  for(const xx of [-.67,.67])for(const zz of [-.45,.45])rod(g,[xx,0,zz],[xx,1.65,zz],.045,palette.wood);
  block(g,palette.wood,[0,.55,.1],[1.45,.14,.75]);for(let i=0;i<6;i++)block(g,0x976c43,[-.60+i*.24,.30,.41],[.21,.52,.07]);
  for(let i=0;i<6;i++){const canopy=block(g,i%2?0x8bb2bd:0x49788c,[-.61+i*.245,1.60,0],[.245,.075,1.2]);canopy.rotation.x=-.13;block(g,i%2?0x8bb2bd:0x49788c,[-.61+i*.245,1.45,.58],[.245,.22,.05]);}
  for(let i=0;i<9;i++)ball(g,[0xe7a35f,0xc65f57,0xa6b66a][i%3],[-.48+(i%3)*.21,.68+Math.floor(i/3)*.09,.24-(i%2)*.12],[.09,.09,.09]);
  block(g,0x967447,[.48,.70,.14],[.26,.28,.3]);ring(g,.09,.015,palette.gold,[.48,.86,.14]);
  // Fence, cultivated wheat and grouped supplies define the village edge.
  const fx=(cottageX-80)*U,fz=(s.pathAt(cottageX)-90)*U;
  for(let i=0;i<5;i++){block(this.static,palette.wood,[fx+i*.37,.35,fz],[.08,.7,.08]);if(i<4)for(const y of [.27,.51])rod(this.static,[fx+i*.37,y,fz],[fx+(i+1)*.37,y,fz],.028,palette.wood);}
  block(this.static,0x9f8455,[fx+.75,.009,fz+.52],[1.42,.018,.68]);for(let i=0;i<35;i++){const xx=fx+.12+(i%7)*.19,zz=fz+.26+Math.floor(i/7)*.12;rod(this.static,[xx,.03,zz],[xx,.38+(i%3)*.025,zz],.013,0xbca15c);ball(this.static,0xd6be6e,[xx,.39,zz],[.043,.11,.032]);}
  for(let i=0;i<3;i++){const xx=x+.95+(i%2)*.40,zz=z+.25+Math.floor(i/2)*.35;block(this.static,0x997347,[xx,.20,zz],[.35,.4,.35]);for(const y of [.06,.33])block(this.static,0xc19c64,[xx,y,zz+.18],[.36,.045,.035]);}
  this.flushInstances();
 }
 buildBridge(s){
  for(const by of s.river.bridges){const x=s.riverCenter(by)*U,z=by*U;
  for(let i=0;i<18;i++){const xx=x-.95+i*.11;const plank=block(this.static,i%3?0xa58657:0xb79867,[xx,.085+(i%3)*.003,z],[.105,.10,1.50]);this.surfaces.push(plank);plank.rotation.y=Math.sin(i*2)*.012;for(const sign of [-1,1])ball(this.static,0x6a6453,[xx,.14,z+sign*.62],[.015,.008,.015]);}
  for(const xx of [x-.79,x+.79])for(const zz of [z-.73,z+.73]){rod(this.static,[xx,-.17,zz],[xx,.63,zz],.062,0x8d714d);ball(this.static,0xb79b69,[xx,.65,zz],[.077,.045,.077]);}
  for(const sign of [-1,1]){rod(this.static,[x-.80,.56,z+sign*.73],[x+.80,.56,z+sign*.73],.026,0xa68b5c);rod(this.static,[x-.80,.30,z+sign*.73],[x+.80,.30,z+sign*.73],.022,0x967b50);}
 }
 }
 buildLandmarks(s){
  const g=new THREE.Group();g.position.set(15,0,southPath(1500,s)*U+1.6);this.static.add(g);
  mesh(g,new THREE.CylinderGeometry(1.4,1.5,.12,24),0xb5b899,[0,.05,0]);
  for(let i=0;i<6;i++){const a=i/6*TAU,x=Math.cos(a)*1.17,z=Math.sin(a)*1.17,h=.55+(i%3)*.28;mesh(g,new THREE.CylinderGeometry(.13,.16,h,10),0xb8bca8,[x,h/2+.1,z]);block(g,0xc5c7b0,[x,h+.13,z],[.35,.10,.35]);}
  ring(g,.82,.035,0xd4c79c,[0,.13,0]);
  const shrine=new THREE.Group();shrine.position.set(73,0,25.0);this.static.add(shrine);mesh(shrine,new THREE.CylinderGeometry(.85,1,.15,8),0x9caeb1,[0,.075,0]);
  mesh(shrine,new THREE.OctahedronGeometry(.48),material(0xa6d7e3,{emissive:0x4a99b6,emissiveIntensity:.4,metalness:.2,roughness:.3}),[0,.75,0],[.6,1.4,.6]);
 }
 buildPortal(){
  this.portal=new THREE.Group();this.portal.visible=false;this.scene.add(this.portal);
  mesh(this.portal,new THREE.CylinderGeometry(.65,.72,.10,24),0xabbda8,[0,.05,0]);
  const frame=ring(this.portal,.68,.075,material(0xcbd9b8,{metalness:.25,roughness:.4}),[0,.96,0],false);
  ring(this.portal,.60,.018,material(0x83dfcf,{emissive:0x438a82,emissiveIntensity:.9}),[0,.96,.035],false);
  this.portalMaterial=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,uniforms:{uTime:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 v;uniform float uTime;void main(){vec2 p=v-.5;float r=length(p)*2.;float a=atan(p.y,p.x);float swirl=.5+.5*sin(a*3.-r*13.+uTime*2.);vec3 c=mix(vec3(.06,.27,.24),vec3(.20,.59,.49),swirl);c+=vec3(.25,.38,.21)*pow(1.-r,2.);gl_FragColor=vec4(c,(1.-smoothstep(.85,1.,r))*.87);
#include <tonemapping_fragment>
#include <colorspace_fragment>}`});
  mesh(this.portal,new THREE.CircleGeometry(.59,48),this.portalMaterial,[0,.96,.02]);
  for(const x of [-.62,.62]){block(this.portal,0x8eaa99,[x,.19,0],[.20,.38,.24]);mesh(this.portal,new THREE.OctahedronGeometry(.065),0xd9eac2,[x,.45,0]);}
  this.portal.traverse(o=>{if(o.isMesh){o.userData.pick={portal:true};this.pickMeshes.push(o);}});
 }
 async loadMaterials(){
  try{const loader=new THREE.ImageLoader();const [image,foliage]=await Promise.all([loader.loadAsync('assets/3d/materials.png'),loader.loadAsync('assets/3d/foliage.png')]);const tex=(col,row,source=image)=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const c=canvas.getContext('2d');c.drawImage(source,col*source.width/2,row*source.height/2,source.width/2,source.height/2,0,0,512,512);const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());return t;};
   const grass=tex(0,0),dirt=tex(1,0),stone=tex(1,1);this.textures={grass,dirt,stone};this.groundMaterial.map=grass;this.groundMaterial.color.set(0xffffff);
   this.groundMaterial.onBeforeCompile=shader=>{shader.uniforms.uDirt={value:dirt};shader.vertexShader='varying float vTerrainX;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTerrainX=position.x;');shader.fragmentShader='uniform sampler2D uDirt;varying float vTerrainX;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','vec4 grassSample=mix(vec4(.16,.32,.09,1.),texture2D(map,vMapUv),.40);vec4 dirtSample=mix(vec4(.64,.49,.29,1.),texture2D(uDirt,vMapUv),.30);float desert=smoothstep(31.0,40.5,vTerrainX)*(1.-smoothstep(60.,64.,vTerrainX));diffuseColor*=mix(grassSample,dirtSample,desert);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.10,.23,.27)*(.7+grassSample.g),smoothstep(61.,66.,vTerrainX)*(1.-smoothstep(80.,84.,vTerrainX)));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.07,.13,.22)*(.8+grassSample.g),smoothstep(81.,86.,vTerrainX));');};this.groundMaterial.needsUpdate=true;
   this.dirtMaterial.map=dirt;this.dirtMaterial.color.set(0xffffff);this.dirtMaterial.needsUpdate=true;
   if(this.cliffMaterial){this.cliffMaterial.map=stone;this.cliffMaterial.needsUpdate=true;}
   const leaf=tex(0,0,foliage),roof=tex(1,0,foliage),bark=tex(0,1,foliage);
   leaf.repeat.set(1.3,1.3);roof.repeat.set(.14,.18);
   for(const m of this.leafMaterials){m.map=leaf;m.color.set(0xe6f0d0);m.needsUpdate=true;}
   for(const m of [...this.barkMaterials,...[0x79573d,0x74553d,0x806040].map(c=>material(c))]){m.map=bark;m.color.set(0xd5c7ad);m.needsUpdate=true;}
   for(const color of [0x456f99,0x5b86af,0x47769f]){const m=material(color);m.map=roof;m.color.set(0xe4eef2);m.needsUpdate=true;}
   for(const color of [0x6d994b,0x4e8047]){const m=material(color);m.map=leaf;m.color.set(0xf0f4db);m.needsUpdate=true;}
   for(const m of this.plateauMaterials){m.map=grass;m.color.set(0xffffff);m.onBeforeCompile=this.groundMaterial.onBeforeCompile;m.needsUpdate=true;}
   const stairs=material(0xb3b59e);stairs.map=stone;stairs.needsUpdate=true;
   for(const e of this.occludingTrees){const zone=this.state.biomeAt(e.tree.x);if(zone==='dusk'||zone==='highlands')for(const m of e.materials){m.color.set(0xffffff);m.onBeforeCompile=shader=>{shader.uniforms.uLeafTint={value:new THREE.Vector3(...(zone==='dusk'?[.62,.86,1.10]:[.86,1.08,1.12]))};shader.fragmentShader='uniform vec3 uLeafTint;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','vec4 leafSample=texture2D(map,vMapUv);float leafLight=dot(leafSample.rgb,vec3(.22,.65,.13));diffuseColor*=vec4(leafLight*uLeafTint,leafSample.a);');};m.needsUpdate=true;}}
   this.textureReady=true;
  }catch(error){document.getElementById('render-status').textContent='3D aktiv · Materialtexturen fehlen';console.error('3D-Materialtexturen:',error);}
 }
 buildEffectPool(){
  this.orbs=[];this.arrows=[];this.zoneMeshes=[];this.lootMeshes=[];this.particles=[];this.labels=[];
  for(let i=0;i<36;i++){const orb=ball(this.effects,material(0x8be5ee,{emissive:0x46b9dc,emissiveIntensity:1.5,roughness:.2}),[0,0,0],[.08,.08,.08]);orb.visible=false;this.orbs.push(orb);}
  for(let i=0;i<24;i++){const g=new THREE.Group();rod(g,[0,0,-.20],[0,0,.16],.009,0x94764e);const tip=mesh(g,new THREE.ConeGeometry(.035,.1,4),0xd0d9ce,[0,0,.20]);tip.rotation.x=Math.PI/2;for(const x of [-.025,.025])block(g,0xcec19a,[x,0,-.15],[.04,.01,.07]);g.visible=false;this.effects.add(g);this.arrows.push(g);}
  for(let i=0;i<12;i++){const g=ring(this.effects,1,.018,material(0xf28b72,{emissive:0xd35336,emissiveIntensity:.6,transparent:true,opacity:.8}),[0,0,0]);g.visible=false;this.zoneMeshes.push(g);}
  for(let i=0;i<80;i++){const g=new THREE.Group();const coin=mesh(g,new THREE.CylinderGeometry(.075,.075,.02,16),material(palette.gold,{metalness:.5,roughness:.35}));coin.rotation.x=Math.PI/2;
   const gem=mesh(g,new THREE.OctahedronGeometry(.09),material(0x90d7df,{emissive:0x3a91a8,emissiveIntensity:.5}),[0,0,0],[.7,1.2,.7]);
   const potion=new THREE.Group();ball(potion,material(0xcf7c76,{roughness:.25}),[0,-.01,0],[.07,.08,.07]);mesh(potion,new THREE.CylinderGeometry(.025,.035,.07,10),0xe3c8a6,[0,.07,0]);block(potion,0x8c6b43,[0,.115,0],[.06,.035,.06]);g.add(potion);g.userData.types={gold:coin,mana:gem,potion};g.visible=false;this.effects.add(g);this.lootMeshes.push(g);}
  for(let i=0;i<100;i++){const m=ball(this.effects,material(0xf6db84,{emissive:0x668842,emissiveIntensity:.4}),[0,0,0],[.025,.025,.025]);m.visible=false;this.particles.push(m);}
  this.impactMeshes=[];for(let i=0;i<12;i++){const r=ring(this.effects,1,.025,material(0xb3e8ed,{emissive:0x66bdcf,emissiveIntensity:.8,transparent:true,opacity:.8}),[0,0,0]);r.visible=false;this.impactMeshes.push(r);}
  this.healSparks=[];for(let i=0;i<9;i++){const m=mesh(this.effects,new THREE.OctahedronGeometry(.045),material(0xd2edaa,{emissive:0x77bb56,emissiveIntensity:.6}));m.visible=false;this.healSparks.push(m);}
  this.castRing=ring(this.effects,.35,.018,material(0x92e5ec,{emissive:0x57bbd0,emissiveIntensity:.7}),[0,0,0]);
  this.targetRing=ring(this.effects,.18,.014,material(0xf8edc2,{emissive:0xdcd098,emissiveIntensity:.4}),[0,0,0]);
  this.overlay=document.createElement('div');this.overlay.id='world-labels';Object.assign(this.overlay.style,{position:'fixed',inset:'0',zIndex:'2',pointerEvents:'none',overflow:'hidden'});document.body.append(this.overlay);
  for(let i=0;i<32;i++){const e=document.createElement('div');e.className='actor-label';e.style.cssText='position:absolute;transform:translate(-50%,-100%);text-align:center;color:#f5eccb;font:bold 11px Trebuchet MS,sans-serif;text-shadow:0 1px 3px #183f32;white-space:nowrap;display:none';this.overlay.append(e);this.labels.push(e);}
 }
 animateHumanoid(model,actor,time,casting=false){
  const rig=model.userData.rig;if(!rig)return;
  const walking=actor.walking??actor.state==='chase';const cycle=actor.walkCycle??time*9+actor.phase;
  const swing=walking?Math.sin(cycle)*.50:0;
  rig.legs[0].rotation.x=swing;rig.legs[1].rotation.x=-swing;
  rig.arms[0].rotation.x=casting?-1.1:-swing*.6;rig.arms[1].rotation.x=casting?-.3:swing*.25;
  rig.body.position.y=walking?Math.abs(Math.sin(cycle))*.035:Math.sin(time*2)*.007;
  rig.head.rotation.z=casting?-.035:0;rig.weapon.rotation.x=(casting&&!rig.crystal)? .65:0;
  if(rig.crystal)rig.crystal.rotation.y=time*.8;
 }
 label(index,text,x,y,z,health=null){
  const e=this.labels[index];if(!e)return;const p=new THREE.Vector3(x,y,z).project(this.camera);const visible=p.z>-1&&p.z<1&&Math.abs(p.x)<1.1&&Math.abs(p.y)<1.1;e.style.display=visible?'block':'none';if(!visible)return;e.style.left=(p.x*.5+.5)*this.width+'px';e.style.top=(-p.y*.5+.5)*this.heightPixels+'px';
  if(health!==null){const html=`<span>${text}</span><div style="width:52px;margin:4px auto 0;height:5px;background:#373d3b;border:1px solid #e1d5ac99;border-radius:3px;overflow:hidden"><div style="width:${Math.max(0,health*100)}%;height:100%;background:#db827f"></div></div>`;if(e.innerHTML!==html)e.innerHTML=html;}
  else if(e.textContent!==text)e.textContent=text;
 }
 render(s){
  this.state=s;
  if(this.currentWorldLevel!==s.worldRun.level){this.currentWorldLevel=s.worldRun.level;for(const m of s.enemies){const model=this.actors.get(m.id);model.traverse(o=>{if(o.userData.pick?.enemy)o.userData.pick={enemy:m};});model.userData.motion={walking:false,walkCycle:0};}}
  if(this.width!==innerWidth||this.heightPixels!==innerHeight)this.resize();
  const dt=Math.min(.05,Math.max(0,s.time-this.lastTime));this.lastTime=s.time;
  const halfX=this.camera.right,halfZ=this.camera.top/Math.sin(Math.atan2(14,12))+.8;
  const focus=new THREE.Vector3(THREE.MathUtils.clamp(s.hero.x*U,halfX,s.WORLD.w*U-halfX),this.height(s.hero.x,s.hero.y)*.35,THREE.MathUtils.clamp(s.hero.y*U,halfZ,s.WORLD.h*U-halfZ));
  this.target.lerp(focus,1-Math.exp(-dt*7.5)||1);
  this.camera.position.copy(this.target).add(new THREE.Vector3(0,14,12));this.camera.lookAt(this.target);
  this.sun.position.copy(this.target).add(new THREE.Vector3(-9,15,8));this.sun.target.position.copy(this.target);
  this.place(this.hero,s.hero.x,s.hero.y);
  const heading=[0,Math.PI/2,Math.PI,-Math.PI/2][s.hero.dir];let delta=heading-this.hero.rotation.y;delta=Math.atan2(Math.sin(delta),Math.cos(delta));this.hero.rotation.y+=delta*Math.min(1,dt*15||1);
  const casting=s.time<s.castUntil||s.time<s.shotCastUntil;this.animateHumanoid(this.hero,s.hero,s.time,casting);
  this.hero.visible=!(s.time<s.heroInvulnerableUntil&&Math.floor(s.time*12)%2===0);
  let labelIndex=0;
  for(const m of s.enemies){const model=this.actors.get(m.id);const oldX=model.position.x,oldZ=model.position.z;model.visible=m.hp>0||s.time-m.deadAt<.45;if(!model.visible)continue;this.place(model,m.x,m.y);
   if(m.hp<=0)model.scale.y=Math.max(.03,1-(s.time-m.deadAt)/.45);else model.scale.y=m.kind==='boss'?1.55:m.kind==='elite'?1.1:1;
   if(m.kind==='slime'){model.scale.set(1+Math.sin(s.time*4+m.phase)*.035,m.hp<=0?model.scale.y:1-Math.sin(s.time*4+m.phase)*.04,1);}
   else{model.rotation.y=Math.atan2(s.hero.x-m.x,s.hero.y-m.y);const motion=model.userData.motion??={walking:false,walkCycle:0};const travelled=Math.hypot(model.position.x-oldX,model.position.z-oldZ);motion.walking=travelled>.0001&&travelled<1;motion.walkCycle+=Math.min(travelled,.1)*9;this.animateHumanoid(model,motion,s.time,s.time<m.attackAnimUntil);}
   if(m.kind==='elite'||m.kind==='boss'){const slam=s.time<m.attackAnimUntil?Math.sin((s.time-m.attackAnimStart)*8)*.07:0;model.rotation.x=slam;}
   model.userData.frost.visible=m.hp>0&&s.time<(m.slowUntil||0);model.userData.frost.rotation.y=s.time*.5;
   const far=Math.hypot(m.x-s.hero.x,m.y-s.hero.y)>900;if(!far&&m.hp>0){this.label(labelIndex++,m.kind==='slime'?'St. '+m.level:m.name+' · '+m.level,m.x*U,this.height(m.x,m.y)+(m.kind==='boss'?3.8:m.kind==='elite'?2.65:m.kind==='slime'?.8:1.55),m.y*U,m.hp/m.maxHp);}
  }
  this.animateHumanoid(this.merchant,{walking:false},s.time);this.label(labelIndex++,'Galdor · Händler [B]',s.merchant.x*U,1.65,s.merchant.y*U);
  for(const n of s.floatingNumbers.slice(-6)){this.label(labelIndex++,n.text,n.x*U,this.height(n.x,n.y)+1.3+n.age*.4,n.y*U);}

  this.orbs.forEach((o,i)=>{const p=s.fireballs[i];o.visible=!!p;if(p){o.position.set(p.x*U,this.height(p.x,p.y)+.7,p.y*U);o.rotation.y=s.time*3;}});
  this.arrows.forEach((o,i)=>{const p=s.enemyShots[i];o.visible=!!p;if(p){o.position.set(p.x*U,this.height(p.x,p.y)+.55,p.y*U);o.rotation.y=Math.atan2(p.vx,p.vy);}});
  this.zoneMeshes.forEach((o,i)=>{const z=s.bossZones[i];o.visible=!!z;if(z){o.position.set(z.x*U,this.height(z.x,z.y)+.04,z.y*U);o.scale.setScalar(z.radius*U);o.material.opacity=.45+.45*Math.min(1,z.age/z.windup);}});
  this.lootMeshes.forEach((o,i)=>{const l=s.loot[i];o.visible=!!l;if(l){o.position.set(l.x*U,this.height(l.x,l.y)+.20+Math.sin(s.time*3+l.id)*.04,l.y*U);o.rotation.y=s.time*1.8;for(const [kind,part]of Object.entries(o.userData.types))part.visible=kind===l.kind;}});
  this.particles.forEach((o,i)=>{const p=s.combatParticles[i];o.visible=!!p;if(p){o.position.set(p.x*U,this.height(p.x,p.y)+.6+(p.age||0)*.3,p.y*U);o.scale.setScalar(Math.max(.005,p.radius*U*(1-p.age/p.life)));}});
  this.impactMeshes.forEach((o,i)=>{const p=s.impactBursts[i];o.visible=!!p;if(p){const t=p.age/p.life;o.position.set(p.x*U,this.height(p.x,p.y)+.08,p.y*U);o.scale.setScalar(.12+t*.65);o.material.opacity=1-t;}});
  this.healSparks.forEach((o,i)=>{o.visible=s.time<s.castUntil;if(o.visible){const t=((s.time-s.castStart)*1.3+i/9)%1,a=i/9*TAU+s.time;o.position.set(s.hero.x*U+Math.cos(a)*.30,this.height(s.hero.x,s.hero.y)+.15+t*1.45,s.hero.y*U+Math.sin(a)*.30);o.rotation.y=s.time*2;}});
  this.castRing.visible=casting;if(casting){const heal=s.time<s.castUntil;this.castRing.material.color.set(heal?0xb8e68b:0x91e2f0);this.castRing.position.copy(this.hero.position).add(new THREE.Vector3(0,.07,0));this.castRing.rotation.z=s.time*1.7;this.castRing.scale.setScalar(1+Math.sin(s.time*10)*.12);}
  this.targetRing.visible=!!s.target;if(s.target){this.targetRing.position.set(s.target.x*U,this.height(s.target.x,s.target.y)+.035,s.target.y*U);this.targetRing.scale.setScalar(1+Math.sin(s.time*4)*.12);}
  const heroBody=this.hero.position.clone().add(new THREE.Vector3(0,.8,0)),towardCamera=new THREE.Vector3(0,14,12).normalize();
  for(const entry of this.occludingTrees){const t=entry.tree,k=t.scale*.88,center=new THREE.Vector3(t.x*U,2.0*k,t.y*U),offset=center.sub(heroBody),along=offset.dot(towardCamera),distance=offset.addScaledVector(towardCamera,-along).length();const occludes=along>0&&along<4&&distance<1.6*k;const desired=occludes ? .28 : 1;entry.alpha=THREE.MathUtils.lerp(entry.alpha,desired,Math.min(1,dt*10||1));for(const m of entry.materials){m.opacity=entry.alpha;m.depthWrite=entry.alpha>.98;}}
  this.portal.visible=s.worldRun.portal.active;
  if(this.portal.visible){this.place(this.portal,s.worldRun.portal.x,s.worldRun.portal.y);this.portalMaterial.uniforms.uTime.value=s.time;this.label(labelIndex++,'WELT '+(s.worldRun.level+1)+' · PORTAL',s.worldRun.portal.x*U,this.portal.position.y+1.9,s.worldRun.portal.y*U);}
  this.waterShader.uniforms.uTime.value=s.time;
  for(let i=labelIndex;i<this.labels.length;i++)this.labels[i].style.display='none';
  this.renderer.render(this.scene,this.camera);
 }
 pick(clientX,clientY){
  this.pointer.set(clientX/this.width*2-1,-clientY/this.heightPixels*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
  const actors=this.raycaster.intersectObjects(this.pickMeshes,false).filter(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});
  if(actors.length){const value=actors[0].object.userData.pick;if(value.portal)return {portal:true,x:this.state.worldRun.portal.x,y:this.state.worldRun.portal.y};const a=value.enemy??this.state.merchant;if(value.enemy&&a.hp<=0)return null;return {x:a.x,y:a.y,...value};}
  // Intersect the actual plateau tops, stair treads, bridge deck and terrain.
  // Iterating against a flat plane loses plateau-edge clicks under an angled camera.
  const hits=this.raycaster.intersectObjects([...this.surfaces,...this.waterObjects],false);
  if(!hits.length)return null;const p=hits[0].point;return {x:p.x/U,y:p.z/U};
 }
 project(x,y,height=0){return new THREE.Vector3(x*U,height,y*U).project(this.camera).toArray();}
 diagnostics(){return {engine:'Three.js',version:THREE.REVISION,webgl:this.renderer.getContext().getParameter(this.renderer.getContext().VERSION),texturesReady:!!this.textureReady,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,worldLevel:this.currentWorldLevel,portalActive:this.portal.visible,trees:this.state.trees.length,fadedTrees:this.occludingTrees.filter(t=>t.alpha<.98).length,models:this.actors.size+2,projection:'orthographic 3D',shadows:this.renderer.shadowMap.enabled};}
}
window.Nobby3D={create:(input,state)=>new World3D(input,state)};
