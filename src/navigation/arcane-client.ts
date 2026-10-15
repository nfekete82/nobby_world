import type { RpgClientEngine } from '@rpgjs/client'
import worlds from '../generated/worlds.json'
import { ARCANE_ACTION, ARCANE_MANA, ARCANE_COOLDOWN_MS, ARCANE_RANGE, ARCANE_SPEED,
 ARCANE_STARTUP_MS, canCast, clearShot, distance, enemyAt } from '../combat/arcane-rules.mjs'
import type { NavigationGrid } from './pathfinding.mjs'

type Point={x:number,y:number}
type Foe={id:string,x:number,y:number,hp:number,actor:any}
const castTimes=new WeakMap<RpgClientEngine,number>()
const pos=(e:any):Point=>({x:Number(e.x()),y:Number(e.y())})
const center=(p:Point):Point=>({x:p.x+16,y:p.y+12})

/** Live synced monster objects, not static Tiled spawn coordinates. */
function enemies(engine:RpgClientEngine,id:string):Foe[]{
 const w=worlds.find(w=>w.id===id)
 if(!w)return []
 const alive=engine.sceneMap.events()
 return w.objects.filter(o=>o.kind==='monster').map(o=>{
  const actor=alive[o.id] as any
  if(!actor)return null
  const x=Number(actor.x()),y=Number(actor.y())
  const hp=Number(actor.hpSignal?.()??0)
  return Number.isFinite(x)&&Number.isFinite(y)
   ? {id:o.id,x,y,hp,actor}:null
 }).filter((v):v is Foe=>!!v&&v.hp>0)
}
function view(engine:RpgClientEngine):any{
 const search=(node:any):any=>{
  if(typeof node?.toScreen==='function'&&typeof node?.toWorld==='function')return node
  for(const child of node?.children??[]){const result=search(child);if(result)return result}
 }
 return search((engine as any).canvasApp?.stage)
}
function flashAt(engine:RpgClientEngine,worldPoint:Point,kind:'burst'|'impact'){
 const node=document.createElement('div')
 node.className='nobby-arcane-'+kind
 node.setAttribute('aria-hidden','true')
 document.body.append(node)
 const stage=view(engine),rect=engine.renderer.canvas.getBoundingClientRect()
 const xy=stage?.toScreen(worldPoint.x,worldPoint.y)
 if(xy){node.style.left=(rect.left+xy.x)+'px';node.style.top=(rect.top+xy.y)+'px'}
 setTimeout(()=>node.remove(),300)
}
/** Screen projection every frame: the bolt follows moving foes and camera scroll. */
function visual(engine:RpgClientEngine,foeId:string,from:Point,to:Point){
 const node=document.createElement('div')
 node.className='nobby-arcane-orb'
 node.setAttribute('aria-hidden','true')
 document.body.append(node)
 const duration=distance(from,to)/ARCANE_SPEED*1000
 const mapId=String(engine.sceneMap.data()?.id??'').replace(/^map-/,'')
 const born=performance.now()+ARCANE_STARTUP_MS
 let emitted=false
 const tick=(now:number)=>{
  if(!node.isConnected)return
  if(String(engine.sceneMap.data()?.id??'').replace(/^map-/,'')!==mapId){node.remove();return}
  const foe=(engine.sceneMap.events() as any)[foeId]
  const target=foe?center(pos(foe)):to
  if(!emitted&&now>=born){flashAt(engine,from,'burst');emitted=true}
  const t=Math.max(0,Math.min(1,(now-born)/Math.max(120,duration)))
  const location={x:from.x+(target.x-from.x)*t,y:from.y+(target.y-from.y)*t-10*Math.sin(Math.PI*t)}
  const viewport=view(engine),rect=engine.renderer.canvas.getBoundingClientRect()
  const screen=viewport?.toScreen(location.x,location.y)
  if(screen){node.style.left=(rect.left+screen.x)+'px';node.style.top=(rect.top+screen.y)+'px'}
  if(t>=1){
   node.remove()
   flashAt(engine,target,'impact')
   window.dispatchEvent(new CustomEvent('nobby:spell-visual',{detail:{phase:'impact',targetId:foeId}}))
   return
  }
  requestAnimationFrame(tick)
 }
 window.dispatchEvent(new CustomEvent('nobby:spell-visual',{detail:{phase:'launch',targetId:foeId}}))
 requestAnimationFrame(tick)
}

/** True when the click selected a monster (even if currently out of reach). */
export function targetAtPointer(engine:RpgClientEngine,mapId:string,point:Point){
 return enemyAt(point,enemies(engine,mapId))
}

/** UI intent only: the server independently rechecks target id, resources,
 * obstacle visibility, range and cooldown before it can deal damage. */
export function tryArcaneCast(engine:RpgClientEngine,mapId:string,foeId:string,nav:NavigationGrid){
 const p=engine.getCurrentPlayer() as any
 if(!p||!foeId||!p.hpSignal?.()||(document.querySelector('#nobby-hud') as HTMLElement|null)?.hidden)return false
 const enemy=enemies(engine,mapId).find(e=>e.id===foeId)
 if(!enemy)return false
 const from=pos(p),to={x:enemy.x,y:enemy.y},now=performance.now()
 const result=canCast({from,to,nav,mana:Number(p.spSignal?.()??0),
  cooldownReady:now>=(castTimes.get(engine)??0)})
 if(result!=='ok'){
  window.dispatchEvent(new CustomEvent('nobby:spell-rejected',{detail:{reason:result,targetId:foeId}}))
  return false
 }
 castTimes.set(engine,now+ARCANE_COOLDOWN_MS)
 engine.processAction(ARCANE_ACTION,{targetId:foeId})
 visual(engine,foeId,center(from),center(to))
 window.dispatchEvent(new CustomEvent('nobby:spell-cast',{detail:{targetId:foeId,action:ARCANE_ACTION,mana:ARCANE_MANA}}))
 return true
}

/** Only approach if out of range. The movement controller follows its existing
 * A* route and periodically tries to cast after reaching a clear vantage. */
export function needsApproach(engine:RpgClientEngine,mapId:string,foeId:string,nav:NavigationGrid){
 const player=engine.getCurrentPlayer() as any,foe=enemies(engine,mapId).find(e=>e.id===foeId)
 if(!player||!foe)return null
 const a=pos(player),b={x:foe.x,y:foe.y}
 return distance(a,b)>ARCANE_RANGE||!clearShot(nav,a,b)?b:null
}
