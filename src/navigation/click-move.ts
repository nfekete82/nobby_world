import type { RpgClientEngine } from '@rpgjs/client'
import worlds from '../generated/worlds.json'
import { findRoute, unpackNavigation } from './pathfinding.mjs'

type Point={x:number,y:number}
type Nav=ReturnType<typeof unpackNavigation>
type State={mapId:string,path:Point[],lastInput:number,lastProgress:number,previous:Point|null,raf:number|null,held:string|null,controls:any}
const instances=new WeakMap<RpgClientEngine,State>()
const cache=new Map<string,Nav>()
let currentEngine:RpgClientEngine|null=null
let installed=false
const mapIdOf=(engine:RpgClientEngine)=>String(engine.sceneMap.data()?.id??'').replace(/^map-/,'')
function nativeControls(engine:RpgClientEngine):any{
  const directive=(engine as any).activeKeyboardControls?.()
  // ControlsDirective.applyControl broadcasts to keyboard + gamepad + joystick;
  // use only the live keyboard channel to avoid duplicate movement packets.
  const keyboard=directive?.keyboard
  return typeof keyboard?.applyControl==='function'?keyboard:null
}
function release(state:State){
  const key=state.held,controls=state.controls
  state.held=null;state.controls=null
  if(key&&controls)void controls.applyControl(key,false).catch(console.warn)
}
function cancel(state:State){state.path=[];release(state)}
function hold(engine:RpgClientEngine,state:State,key:string):boolean{
  const controls=nativeControls(engine)
  if(!controls)return false
  if(key===state.held&&controls===state.controls)return true
  release(state)
  state.held=key;state.controls=controls
  // This is the *same* CanvasEngine control path as WASD: it drives
  // predicted movement AND sets the full walk animation on the character.
  void controls.applyControl(key,true).catch(error=>{cancel(state);console.warn(error)})
  window.dispatchEvent(new CustomEvent('nobby:move-control',{detail:{direction:key,source:'native-keyboard'}}))
  return true
}

function navFor(id:string):Nav|undefined {
  const world=worlds.find(w=>w.id===id)
  if(!world?.navigation)return undefined
  if(!cache.has(id))cache.set(id,unpackNavigation(world.navigation))
  return cache.get(id)
}
function position(player:any):Point{return {x:Number(player.x()),y:Number(player.y())}}
function viewportOf(node:any):any{
  if(typeof node?.toWorld==='function')return node
  for(const child of node?.children??[]){
    const result=viewportOf(child)
    if(result)return result
  }
}
/** Register once per engine; do not depend on the renderer having mounted yet. */
/** One pointer handler bound to the ready map engine, never transient engines. */
function init():void{
  if(installed)return
  installed=true
  const diagnose=(reason:string,details:Record<string,unknown>={})=>
    window.dispatchEvent(new CustomEvent('nobby:move-diagnostic',{detail:{reason,...details}}))
  window.addEventListener('pointerdown',(event:PointerEvent)=>{
    if(event.button!==0||!event.isPrimary)return
    const engine=currentEngine
    if(!engine)return
    const canvas=event.composedPath().find((node):node is HTMLCanvasElement=>
      node instanceof HTMLCanvasElement)
    if(!canvas)return
    const rendererCanvas=((engine as any).renderer?.canvas??(engine as any).canvasApp?.canvas)
    const root=document.querySelector('#rpg')
    if(canvas!==rendererCanvas&&!root?.contains(canvas))return
    if((document.querySelector('#nobby-hud') as HTMLElement|null)?.hidden)return
    const mapId=mapIdOf(engine),nav=navFor(mapId),player=engine.getCurrentPlayer() as any
    if(!nav||!player){diagnose('map-or-player-missing',{mapId});return}
    const rect=canvas.getBoundingClientRect(),viewport=viewportOf((engine as any).canvasApp?.stage)
    if(!viewport||!rect.width||!rect.height){diagnose('viewport-missing',{mapId});return}
    const p=viewport.toWorld(event.clientX-rect.left,event.clientY-rect.top)
    if(!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return
    const target={x:p.x-16,y:p.y-12},state=instances.get(engine)!
    cancel(state)
    state.mapId=mapId
    state.path=findRoute(nav,position(player),target)
    state.lastProgress=performance.now()
    state.previous=position(player)
    window.dispatchEvent(new CustomEvent('nobby:move-target',{detail:{
      mapId,target,waypoints:state.path.length,inputMode:'native-keyboard'
    }}))
    diagnose(state.path.length?'route-accepted':'route-empty',{mapId,waypoints:state.path.length})
    if(state.path.length)startRoute(engine,state)
  },{capture:true})
  window.addEventListener('keydown',event=>{
    if(!currentEngine)return
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d','W','A','S','D','Escape',' ','h','H'].includes(event.key))
      cancel(instances.get(currentEngine)!)
  },{capture:true})
}
/**
 * Mouse navigation has its own animation-frame clock: engine onStep may run
 * slower than keyboard sampling. Feeding discrete impulses only on onStep
 * caused the renderer to alternate between walk and stand.
 */
function startRoute(engine:RpgClientEngine,state:State){
  if(state.raf!==null)return
  const step=()=>{
    state.raf=null
    if(driveRoute(engine,state))
      state.raf=requestAnimationFrame(step)
  }
  state.raf=requestAnimationFrame(step)
}

function driveRoute(engine:RpgClientEngine,state:State):boolean{
  if(!state.path.length)return false
  const mapId=mapIdOf(engine)
  if(mapId!==state.mapId){cancel(state);return false}
  const player=engine.getCurrentPlayer() as any
  const hud=document.querySelector('#nobby-hud') as HTMLElement|null
  const canMove=typeof player?.canMove==='function'?player.canMove():player?.canMove
  if(!player||hud?.hidden||canMove===false||player.knockbackActive?.()){
    cancel(state);return false
  }
  const at=position(player),now=performance.now()
  if(!state.previous||Math.hypot(at.x-state.previous.x,at.y-state.previous.y)>4){
    state.previous=at;state.lastProgress=now
  }else if(now-state.lastProgress>1100){
    cancel(state);return false // Dynamic obstacle or blocked movement
  }
  while(state.path.length&&Math.abs(at.x-state.path[0].x)<=9&&Math.abs(at.y-state.path[0].y)<=9)
    state.path.shift()
  if(!state.path.length){release(state);return false}
  const next=state.path[0],dx=next.x-at.x,dy=next.y-at.y
  const direction=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up')
  if(!hold(engine,state,direction)){cancel(state);return false}
  return true
}

/** Register one listener and keep only an active, fully initialized client. */
export function updateClickMove(engine:RpgClientEngine){
  init()
  const mapId=mapIdOf(engine)
  if(!mapId||!navFor(mapId)||!engine.getCurrentPlayer()||!nativeControls(engine))return
  if(currentEngine&&currentEngine!==engine){
    const previous=instances.get(currentEngine)
    if(previous)cancel(previous)
  }
  currentEngine=engine
  let state=instances.get(engine)
  if(!state){
    state={mapId,path:[],lastInput:0,lastProgress:0,previous:null,raf:null,held:null,controls:null}
    instances.set(engine,state)
  }
  if(mapId!==state.mapId){cancel(state);state.mapId=mapId}
}
