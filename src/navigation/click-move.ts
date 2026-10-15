import type { RpgClientEngine } from '@rpgjs/client'
import worlds from '../generated/worlds.json'
import { findRoute, unpackNavigation } from './pathfinding.mjs'
import { targetAtPointer, needsApproach, tryArcaneCast } from './arcane-client'
import { ARCANE_RANGE, clearShot, distance } from '../combat/arcane-rules.mjs'

type Point={x:number,y:number}
type Nav=ReturnType<typeof unpackNavigation>
type State={mapId:string,path:Point[],targetId:string|null,lastInput:number,lastProgress:number,previous:Point|null,raf:number|null,held:string|null,controls:any}
const instances=new WeakMap<RpgClientEngine,State>()
const cache=new Map<string,Nav>()
let currentEngine:RpgClientEngine|null=null
let installed=false
const heldPhysicalKeys=new Set<string>()
const enhancedKeyboards=new WeakSet<object>()
const mapIdOf=(engine:RpgClientEngine)=>String(engine.sceneMap.data()?.id??'').replace(/^map-/,'')
/** Native RPG-JS vector velocity with zero speed boost.
 * Movement remains collision-checked and synchronized by the server.
 * Cardinal input keeps using CanvasEngine's original keyboard callbacks.
 */
function enableKeyboardDiagonals(engine:RpgClientEngine):void{
  const keyboard=(engine as any).activeKeyboardControls?.()?.keyboard
  if(!keyboard||typeof keyboard.setInputs!=='function')return
  const original=keyboard.options??{}
  const diagonalPairs:[string,string,string][]=[
    ['up_left','up','left'],['up_right','up','right'],
    ['down_left','down','left'],['down_right','down','right']
  ]
  const additions:Record<string,any>={}
  for(const [combo,a,b] of diagonalPairs){
    if(original[combo])continue
    if(typeof original[a]?.keyDown!=='function'||typeof original[b]?.keyDown!=='function')continue
    additions[combo]={
      bind:combo,repeat:true,
      keyDown(){
        // Suppress the two individual cardinal callbacks. The shared physical
        // key sampler below sends the one authoritative vector instead.
      }
    }
  }
  if(Object.keys(additions).length)keyboard.setInputs({...original,...additions})
  if(enhancedKeyboards.has(keyboard)||typeof keyboard.getDirection!=='function')return
  enhancedKeyboards.add(keyboard)
  const originalDirection=keyboard.getDirection.bind(keyboard)
  // CanvasEngine recognizes simultaneous arrow keys natively. For remapped
  // WASD keys, getDirection() currently returns "none" and dispatches two
  // separate cardinals (the second one overwrites the first's velocity).
  // Recognize held remapped keys only when a vertical AND horizontal key are
  // pressed. Single-key keyboard behavior remains unchanged.
  keyboard.getDirection=()=>{
    const native=originalDirection()
    if(native!=='none')return native
    const pressed=(action:string):boolean=>{
      const raw=keyboard.options?.[action]?.bind
      const binds=Array.isArray(raw)?raw:[raw]
      return binds.some((key:unknown)=>
        typeof key==='string'&&!!keyboard.keyState?.[key.toLowerCase()]?.isDown)
    }
    const vertical=pressed('up')?'up':pressed('down')?'down':null
    const horizontal=pressed('left')?'left':pressed('right')?'right':null
    return vertical&&horizontal?`${vertical}_${horizontal}`:'none'
  }
}

const diagonalRate=new WeakMap<RpgClientEngine,number>()
const DIAGONAL_INTERVAL_MS=65
const DIAGONAL_HOLD_MS=110
// RPG-JS 5's local character renderer chooses animationPlayback.name ahead
// of the synchronized stand/walk state. Vector movement alone does NOT call
// its playPredictedWalkAnimation() hook, so the feet otherwise remain idle.
// Use an owned, CLIENT-ONLY playback override: no position/server mutations.
const diagonalWalks=new WeakMap<RpgClientEngine,{player:any,playback:{name:string}}>()
const lastDiagonalWalkAt=new WeakMap<RpgClientEngine,number>()
const DIAGONAL_WALK_GRACE_MS=160

function stopDiagonalWalk(engine:RpgClientEngine):void{
  const owned=diagonalWalks.get(engine)
  if(!owned)return
  diagonalWalks.delete(engine)
  if(owned.player.animationPlayback?.()===owned.playback){
    owned.player.animationPlayback.set(null)
  }
  window.dispatchEvent(new CustomEvent('nobby:diagonal-animation',{
    detail:{action:'stop',name:'walk',owned:true}
  }))
}

function ensureDiagonalWalk(engine:RpgClientEngine,player:any):void{
  const current=diagonalWalks.get(engine)
  if(current?.player===player&&player.animationPlayback?.()===current.playback)return
  if(current)stopDiagonalWalk(engine)
  // Never override attacks, heals, knockback or an existing one-shot.
  const name=player.animationName?.()
  if((name!=='stand'&&name!=='walk')||player.animationFixed||
    player.animationIsPlaying?.()||player.knockbackActive?.()||player.animationPlayback?.())return
  if(typeof player.animationPlayback?.set!=='function')return
  const playback={name:'walk'}
  diagonalWalks.set(engine,{player,playback})
  player.animationPlayback.set(playback)
  window.dispatchEvent(new CustomEvent('nobby:diagonal-animation',{
    detail:{action:'start',name:'walk',owned:true,frames:4}
  }))
}

function syncDiagonalWalk(engine:RpgClientEngine):void{
  const owned=diagonalWalks.get(engine)
  if(!owned)return
  const player=engine.getCurrentPlayer() as any
  if(player!==owned.player||player.knockbackActive?.()||player.animationFixed||
    player.animationIsPlaying?.()||(typeof player.canMove==='function'?player.canMove()===false:player.canMove===false)||
    performance.now()-(lastDiagonalWalkAt.get(engine)??0)>DIAGONAL_WALK_GRACE_MS){
    stopDiagonalWalk(engine)
  }
}

/** Real 45° velocity, handled by RPG-JS's authoritative vector-movement
 * physics. No extra speed is applied (additionalSpeed = 0). */
function applyDiagonal(engine:RpgClientEngine,dx:number,dy:number,source:'mouse'|'keyboard'):void{
  if(!dx||!dy)return
  const now=performance.now()
  if(now-(diagonalRate.get(engine)??-Infinity)<DIAGONAL_INTERVAL_MS)return
  const player=engine.getCurrentPlayer() as any
  const canMove=typeof player?.canMove==='function'?player.canMove():player?.canMove
  if(!player||player.knockbackActive?.()||player.animationIsPlaying?.()||canMove===false||
    ((document.querySelector('#nobby-hud') as HTMLElement|null)?.hidden)){
    stopDiagonalWalk(engine)
    return
  }
  diagonalRate.set(engine,now)
  lastDiagonalWalkAt.set(engine,now)
  ensureDiagonalWalk(engine,player)
  void engine.processDash({
    direction:{x:Math.sign(dx),y:Math.sign(dy)},
    additionalSpeed:0,cooldown:0,duration:DIAGONAL_HOLD_MS
  })
  window.dispatchEvent(new CustomEvent('nobby:diagonal-input',{
    detail:{dx:Math.sign(dx),dy:Math.sign(dy),source,mode:'normalized-vector'}
  }))
}

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
function cancel(state:State){state.path=[];state.targetId=null;release(state)}
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
/** Physical keyboard sampler; independent of CanvasEngine's 60Hz keyState.
 * Supports arrow chords and WASD with the same normalized diagonal velocity.
 */
function physicalDirection():{dx:number,dy:number}|null{
  const held=(...names:string[])=>names.some(name=>heldPhysicalKeys.has(name))
  const up=held('arrowup','w'),down=held('arrowdown','s')
  const left=held('arrowleft','a'),right=held('arrowright','d')
  const dx=left===right?0:left?-1:1
  const dy=up===down?0:up?-1:1
  return dx&&dy?{dx,dy}:null
}
function drivePhysicalChord(engine:RpgClientEngine){
  const dir=physicalDirection()
  if(dir)applyDiagonal(engine,dir.dx,dir.dy,'keyboard')
}

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
    const foe=targetAtPointer(engine,mapId,{x:p.x,y:p.y})
    if(foe){
      const approach=needsApproach(engine,mapId,foe.id,nav)
      if(!approach){
        tryArcaneCast(engine,mapId,foe.id,nav)
        return // Enemy click never means walking through the enemy.
      }
      const route=findRoute(nav,position(player),approach)
      const stopAt=route.findIndex(point=>
        distance(point,approach)<=ARCANE_RANGE-38&&clearShot(nav,point,approach))
      state.path=stopAt>=0?route.slice(0,stopAt+1):route
      state.targetId=foe.id
      window.dispatchEvent(new CustomEvent('nobby:enemy-target',{detail:{targetId:foe.id,approach:true}}))
    }else{
      state.path=findRoute(nav,position(player),target)
    }
    state.lastProgress=performance.now()
    state.previous=position(player)
    window.dispatchEvent(new CustomEvent('nobby:move-target',{detail:{
      mapId,target,waypoints:state.path.length,inputMode:'native-keyboard'
    }}))
    diagnose(state.path.length?'route-accepted':'route-empty',{mapId,waypoints:state.path.length})
    if(state.path.length)startRoute(engine,state)
  },{capture:true})
  window.addEventListener('keydown',event=>{
    const key=event.key.toLowerCase()
    if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key))
      heldPhysicalKeys.add(key)
    if(!currentEngine)return
    if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','escape',' ','h'].includes(key)){
      const state=instances.get(currentEngine)
      if(state)cancel(state)
      if(['escape',' ','h'].includes(key))stopDiagonalWalk(currentEngine)
    }
    drivePhysicalChord(currentEngine)
  },{capture:true})
  window.addEventListener('keyup',event=>{
    heldPhysicalKeys.delete(event.key.toLowerCase())
  },{capture:true})
  window.addEventListener('blur',()=>{
    heldPhysicalKeys.clear()
    if(currentEngine)stopDiagonalWalk(currentEngine)
  })
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
  if(state.targetId){
    const nav=navFor(mapId)
    if(!nav){cancel(state);return false}
    if(!needsApproach(engine,mapId,state.targetId,nav)){
      const id=state.targetId
      cancel(state)
      tryArcaneCast(engine,mapId,id,nav)
      return false
    }
  }
  if(!state.previous||Math.hypot(at.x-state.previous.x,at.y-state.previous.y)>4){
    state.previous=at;state.lastProgress=now
  }else if(now-state.lastProgress>1100){
    cancel(state);return false // Dynamic obstacle or blocked movement
  }
  while(state.path.length&&Math.abs(at.x-state.path[0].x)<=9&&Math.abs(at.y-state.path[0].y)<=9)
    state.path.shift()
  if(!state.path.length){
    const id=state.targetId,nav=navFor(mapId)
    release(state);state.targetId=null
    if(id&&nav)tryArcaneCast(engine,mapId,id,nav)
    return false
  }
  const next=state.path[0],dx=next.x-at.x,dy=next.y-at.y
  const ax=Math.abs(dx),ay=Math.abs(dy)
  // A* emits straight 45° segments. Small sub-tile offsets are normal after
  // the previous waypoint and should not turn a diagonal into a staircase.
  const diagonal=Math.min(ax,ay)>=8&&Math.max(ax,ay)<=Math.min(ax,ay)*2.5
  if(diagonal){
    release(state)
    applyDiagonal(engine,dx,dy,'mouse')
    return true
  }
  stopDiagonalWalk(engine) // Native keyboard owns the cardinal walk animation.
  const direction=ax>ay?(dx>0?'right':'left'):(dy>0?'down':'up')
  if(!hold(engine,state,direction)){cancel(state);return false}
  return true
}

/** Register one listener and keep only an active, fully initialized client. */
export function updateClickMove(engine:RpgClientEngine){
  init()
  const mapId=mapIdOf(engine)
  if(!mapId||!navFor(mapId)||!engine.getCurrentPlayer()||!nativeControls(engine))return
  enableKeyboardDiagonals(engine)
  if(currentEngine&&currentEngine!==engine){
    const previous=instances.get(currentEngine)
    if(previous)cancel(previous)
    stopDiagonalWalk(currentEngine)
  }
  currentEngine=engine
  let state=instances.get(engine)
  if(!state){
    state={mapId,path:[],targetId:null,lastInput:0,lastProgress:0,previous:null,raf:null,held:null,controls:null}
    instances.set(engine,state)
  }
  if(mapId!==state.mapId){cancel(state);state.mapId=mapId;stopDiagonalWalk(engine)}
  drivePhysicalChord(engine)
  syncDiagonalWalk(engine)
}
