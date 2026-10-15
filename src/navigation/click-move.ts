import type { RpgClientEngine } from '@rpgjs/client'
import worlds from '../generated/worlds.json'
import { findRoute, unpackNavigation } from './pathfinding.mjs'

type Point={x:number,y:number}
type Nav=ReturnType<typeof unpackNavigation>
type State={mapId:string,path:Point[],lastInput:number,lastProgress:number,previous:Point|null}
const instances=new WeakMap<RpgClientEngine,State>()
const cache=new Map<string,Nav>()

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
function init(engine:RpgClientEngine,state:State):boolean{
  // Use the real Pixi canvas. canvasElement can be a wrapper in RPG-JS 5.
  const canvas=((engine as any).renderer?.canvas??(engine as any).canvasApp?.canvas) as HTMLCanvasElement|undefined
  if(!canvas?.addEventListener)return false
  canvas.style.cursor='crosshair'
  canvas.addEventListener('pointerdown',(event:PointerEvent)=>{
    if(event.button!==0||!event.isPrimary)return
    if((document.querySelector('#nobby-hud') as HTMLElement|null)?.hidden)return
    const mapId=String(engine.sceneMap.data()?.id??'').replace(/^map-/,'')
    const nav=navFor(mapId),player=engine.getCurrentPlayer() as any
    if(!nav||!player)return
    const rect=canvas.getBoundingClientRect()
    const viewport=viewportOf((engine as any).canvasApp?.stage)
    if(!viewport||!rect.width||!rect.height)return
    // Match RPG-JS's own pointer tracking, including its viewport camera.
    const p=viewport.toWorld(event.clientX-rect.left,event.clientY-rect.top)
    if(!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return
    const goal={x:p.x-16,y:p.y-12} // actor 32x24px hitbox
    state.path=findRoute(nav,position(player),goal)
    state.mapId=mapId
    state.lastInput=0;state.lastProgress=performance.now()
    state.previous=position(player)
  })
  window.addEventListener('keydown',(event)=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d','W','A','S','D','Escape',' ','h','H'].includes(event.key)){
      state.path=[]
    }
  },{capture:true})
  return true
}
/** Use the same predicted, server-authoritative movement packets as the keyboard. */
export function updateClickMove(engine:RpgClientEngine){
  let state=instances.get(engine)
  if(!state){
    state={mapId:'',path:[],lastInput:0,lastProgress:0,previous:null}
    if(!init(engine,state))return
    instances.set(engine,state)
  }
  const mapId=String(engine.sceneMap.data()?.id??'').replace(/^map-/,'')
  if(mapId!==state.mapId){state.path=[];state.mapId=mapId}
  if(!state.path.length)return
  const player=engine.getCurrentPlayer() as any
  const hud=document.querySelector('#nobby-hud') as HTMLElement|null
  const canMove=typeof player?.canMove==='function'?player.canMove():player?.canMove
  if(!player||hud?.hidden||canMove===false||(typeof player.knockbackActive==='function'&&player.knockbackActive())){
    state.path=[];return
  }
  const at=position(player),now=performance.now()
  if(!state.previous||Math.hypot(at.x-state.previous.x,at.y-state.previous.y)>4){
    state.previous=at;state.lastProgress=now
  }else if(now-state.lastProgress>1100){
    state.path=[];return // dynamic obstacles / combat interruption
  }
  while(state.path.length&&Math.abs(at.x-state.path[0].x)<=9&&Math.abs(at.y-state.path[0].y)<=9)
    state.path.shift()
  if(!state.path.length||now-state.lastInput<65)return
  const next=state.path[0],dx=next.x-at.x,dy=next.y-at.y
  const direction=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up')
  state.lastInput=now
  void engine.processInput({input:{type:'move',direction} as any})
}
