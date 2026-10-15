import type { RpgClientEngine } from '@rpgjs/client'
import worlds from '../generated/worlds.json'
import art from '../art/registry.json'

let root: HTMLElement, hp: HTMLElement, mana: HTMLElement, title: HTMLElement, region: HTMLElement, gold: HTMLElement
let healButton: HTMLButtonElement
let lastUpdate=0
function mount(engine: RpgClientEngine){
 root=document.createElement('aside');root.id='nobby-hud';root.setAttribute('aria-label','Spielerstatus')
 root.innerHTML='<div class="nobby-status"><div class="nobby-portrait" aria-hidden="true"></div><div class="nobby-vitals"><strong class="nobby-name"></strong><div class="nobby-meter hp"><i></i><span></span></div><div class="nobby-meter mana"><i></i><span></span></div></div></div><div class="nobby-region"><strong></strong><span></span></div><nav class="nobby-actions" aria-label="Spielaktionen"><button type="button" data-action="heal" title="H · 25 Mana, heilt 25 % Leben">✦ <span>Heilen</span><kbd>H</kbd></button><button type="button" data-action="escape">☰ <span>Menü</span><kbd>Esc</kbd></button></nav><div class="nobby-controls">Linksklick: Laufen · Gegner anklicken: Arkankugel (12 Mana) <b>WASD · Bewegen</b></div>'
 document.body.append(root)
 const portrait=root.querySelector<HTMLElement>('.nobby-portrait')!,hero=art.assets.hero
 portrait.style.backgroundImage=`url("${import.meta.env.BASE_URL}${hero.animations.stand.image}")`
 // Keep the sprite foot anchor stable while enlarging the portrait by 25%.
 const portraitScale=1.25
 portrait.style.backgroundSize=`${hero.frame[0]*hero.animations.stand.frames*portraitScale}px ${hero.frame[1]*portraitScale}px`
 portrait.style.backgroundPosition=`${40-hero.foot[0]*portraitScale}px ${98-hero.foot[1]*portraitScale}px`
 healButton=root.querySelector<HTMLButtonElement>('button[data-action="heal"]')!
 hp=root.querySelector('.hp')!;mana=root.querySelector('.mana')!;title=root.querySelector('.nobby-name')!;region=root.querySelector('.nobby-region strong')!;gold=root.querySelector('.nobby-region span')!
 root.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach(b=>b.addEventListener('click',()=>{engine.processAction(b.dataset.action!);b.blur()}))
}
function meter(node:HTMLElement,value:number,max:number,label:string){
 node.querySelector<HTMLElement>('i')!.style.width=`${Math.min(100,Math.max(0,value/max*100))}%`
 node.querySelector('span')!.textContent=`${label}  ${Math.round(value)} / ${Math.round(max)}`
}
export function updateHud(engine:RpgClientEngine){
 if(performance.now()-lastUpdate<100)return;lastUpdate=performance.now()
 if(!root)mount(engine)
 const player=engine.getCurrentPlayer() as any
 // The same private integration boundary as the camera; native GUI keeps full
 // ownership of input, focus, saves and menus. No parallel game state is stored.
 const modal=Object.values((engine as any).guiService?.gui?.()??{}).some((g:any)=>['rpg-dialog','rpg-main-menu','rpg-shop','rpg-save','rpg-title-screen','rpg-gameover','rpg-input','rpg-character-select'].includes(g.name)&&g.display?.())
 root.hidden=!player||modal
 if(!player)return
 title.textContent=`nobby · Stufe ${player._level()}`
 const params=player._param()
 const currentHp=player.hpSignal(), currentMana=player.spSignal(), maximumHp=params.maxHp||1
 meter(hp,currentHp,maximumHp,'LEBEN');meter(mana,currentMana,params.maxSp||1,'MANA')
 healButton.disabled=!(currentHp>0&&currentHp<maximumHp&&currentMana>=25)
 const id=String(engine.sceneMap.data()?.id??'').replace(/^map-/,'')
 region.textContent=worlds.find(w=>w.id===id)?.title??'Nobby World';gold.textContent=`${player._gold()} Gold`
}
