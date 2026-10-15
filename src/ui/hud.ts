import type { RpgClientEngine } from '@rpgjs/client'
import worlds from '../generated/worlds.json'
import art from '../art/registry.json'
import { ensureEditorMenu } from './web-editor'
import { updateCharacterSelect } from './character-select'

let root: HTMLElement, hp: HTMLElement, mana: HTMLElement, xp: HTMLElement
let title: HTMLElement, region: HTMLElement, gold: HTMLElement
let statsPanel: HTMLElement, pointsLabel: HTMLElement, statsButton: HTMLButtonElement
let healButton: HTMLButtonElement
let summonButton: HTMLButtonElement
let lastUpdate=0
let activeEngine:RpgClientEngine
const choices=[
 {key:'health',label:'Vitalität',bonus:'+10 max. Leben',field:'nobbyStatHealth'},
 {key:'mana',label:'Mana',bonus:'+10 max. Mana',field:'nobbyStatMana'},
 {key:'magic',label:'Magiekraft',bonus:'+2 Zauberschaden',field:'nobbyStatMagic'},
 {key:'defense',label:'Verteidigung',bonus:'+2 Verteidigung',field:'nobbyStatDefense'}
]
const readNumber=(entity:any,key:string)=>{
 const prop=entity?.[key],raw=typeof prop==='function'?prop():prop
 return Number.isFinite(raw)?Number(raw):0
}
function mount(engine: RpgClientEngine){
 root=document.createElement('aside');root.id='nobby-hud';root.setAttribute('aria-label','Spielerstatus')
 root.innerHTML=`<div class="nobby-status"><div class="nobby-portrait" aria-hidden="true"></div><div class="nobby-vitals"><strong class="nobby-name"></strong><div class="nobby-meter hp"><i></i><span></span></div><div class="nobby-meter mana"><i></i><span></span></div><div class="nobby-meter xp"><i></i><span></span></div></div></div><div class="nobby-region"><strong></strong><span></span></div><nav class="nobby-actions" aria-label="Spielaktionen"><button type="button" data-ui="stats" title="C · Charakterwerte und Attributpunkte">✧ <span>Charakter</span><kbd>C</kbd></button><button type="button" data-action="heal" title="H · 25 Mana, heilt 25 % Leben">✦ <span>Heilen</span><kbd>H</kbd></button><button type="button" data-action="escape">☰ <span>Menü</span><kbd>Esc</kbd></button></nav><section class="nobby-stats-panel" hidden aria-label="Charakterentwicklung"><div class="nobby-stats-head"><h2>Charakterentwicklung</h2><button type="button" data-ui="close-stats" aria-label="Charakterfenster schließen">✕</button></div><p class="nobby-stats-points"></p><p class="nobby-stats-xp" aria-live="off"></p><div class="nobby-stats-grid">${choices.map(c=>`<div class="nobby-stats-row"><div><strong>${c.label}</strong><small>${c.bonus} pro Punkt</small></div><span data-stat-value="${c.key}">0</span><button type="button" data-stat="${c.key}" aria-label="Punkt in ${c.label} investieren">+</button></div>`).join('')}</div><p class="nobby-stats-note">Jeder Levelaufstieg gibt 3 frei verteilbare Punkte.</p></section><div class="nobby-controls">Linksklick: Laufen · Gegner anklicken: Arkankugel (12 Mana) <b>WASD · Bewegen</b></div>`
 document.body.append(root)
 const portrait=root.querySelector<HTMLElement>('.nobby-portrait')!,hero=art.assets.hero
 portrait.style.backgroundImage=`url("${import.meta.env.BASE_URL}${hero.animations.stand.image}")`
 const portraitScale=1.25
 portrait.style.backgroundSize=`${hero.frame[0]*hero.animations.stand.frames*portraitScale}px ${hero.frame[1]*portraitScale}px`
 portrait.style.backgroundPosition=`${40-hero.foot[0]*portraitScale}px ${98-hero.foot[1]*portraitScale}px`
 healButton=root.querySelector<HTMLButtonElement>('button[data-action="heal"]')!
 summonButton=document.createElement('button')
 summonButton.type='button';summonButton.dataset.action='nobby:summon'
 summonButton.innerHTML='<span class="summon-icon" aria-hidden="true"></span><span>Skelett erwecken</span><small>10 Mana · <b>0/3</b></small><kbd>R</kbd>'
 summonButton.title='R · Skelett erwecken · 10 Mana · 60 Sekunden'
 root.querySelector('.nobby-actions')!.insertBefore(summonButton,healButton)
 hp=root.querySelector('.hp')!;mana=root.querySelector('.mana')!;xp=root.querySelector('.xp')!
 title=root.querySelector('.nobby-name')!;region=root.querySelector('.nobby-region strong')!;gold=root.querySelector('.nobby-region span')!
 statsPanel=root.querySelector('.nobby-stats-panel')!;pointsLabel=root.querySelector('.nobby-stats-points')!
 statsButton=root.querySelector<HTMLButtonElement>('button[data-ui="stats"]')!
 const close=()=>{statsPanel.hidden=true;statsButton.setAttribute('aria-expanded','false')}
 const toggle=()=>{statsPanel.hidden=!statsPanel.hidden;statsButton.setAttribute('aria-expanded',String(!statsPanel.hidden))}
 statsButton.setAttribute('aria-expanded','false')
 statsButton.addEventListener('click',toggle)
 root.querySelector<HTMLButtonElement>('button[data-ui="close-stats"]')!.addEventListener('click',close)
 root.querySelectorAll<HTMLButtonElement>('button[data-stat]').forEach(button=>button.addEventListener('click',()=>{
     activeEngine.processAction('nobby:allocate-stat',{stat:button.dataset.stat})
     button.blur()
 }))
 root.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach(b=>b.addEventListener('click',()=>{activeEngine.processAction(b.dataset.action!);b.blur()}))
 document.addEventListener('keydown',(e)=>{
     if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||root.hidden)return
     const target=e.target as HTMLElement
     if(target?.matches?.('input, textarea, select, [contenteditable="true"]'))return
     if(document.querySelector<HTMLDialogElement>('#nobby-character-select')?.open)return
     if(e.code==='KeyR'&&!summonButton.hidden&&!summonButton.disabled){e.preventDefault();activeEngine.processAction('nobby:summon')}
     if(e.code==='KeyC'){e.preventDefault();toggle()}
     // Escape is handled by the normal RPG-JS menu if the panel is not open.
     else if(e.key==='Escape'&&!statsPanel.hidden){e.preventDefault();e.stopImmediatePropagation();close()}
 },true)
}
function meter(node:HTMLElement,value:number,max:number,label:string){
 node.querySelector<HTMLElement>('i')!.style.width=`${Math.min(100,Math.max(0,value/Math.max(1,max)*100))}%`
 node.querySelector('span')!.textContent=`${label}  ${Math.round(value)} / ${Math.round(max)}`
}
export function updateHud(engine:RpgClientEngine){
 activeEngine=engine
 if(performance.now()-lastUpdate<100)return;lastUpdate=performance.now()
 if(!root)mount(engine)
 ensureEditorMenu(engine)
 const player=engine.getCurrentPlayer() as any
 updateCharacterSelect(engine,player)
 const modal=Object.values((engine as any).guiService?.gui?.()??{}).some((g:any)=>['rpg-dialog','rpg-main-menu','rpg-shop','rpg-save','rpg-title-screen','rpg-gameover','rpg-input','rpg-character-select'].includes(g.name)&&g.display?.())
 const classProp=player?.nobbyClass,selectedClass=typeof classProp==='function'?classProp():classProp
 root.hidden=!player||modal||!selectedClass
 if(!player||modal){if(statsPanel)statsPanel.hidden=true;return}
 title.textContent=`nobby · Stufe ${player._level()}`
 const params=player._param()
 const currentHp=player.hpSignal(),currentMana=player.spSignal(),maximumHp=params.maxHp||1
 meter(hp,currentHp,maximumHp,'LEBEN');meter(mana,currentMana,params.maxSp||1,'MANA')
 healButton.disabled=!(currentHp>0&&currentHp<maximumHp&&currentMana>=25)
 summonButton.hidden=selectedClass!=='shaman'
 const remaining=Math.max(0,readNumber(player,'nobbySummonUntil')-Date.now())
 const count=readNumber(player,'nobbySkeletons')
 summonButton.disabled=currentHp<=0||currentMana<10||count>=3||remaining>0
 summonButton.querySelector('b')!.textContent=`${count}/3${remaining?` · ${(remaining/1000).toFixed(1)} s`:''}`
 const portrait=root.querySelector<HTMLElement>('.nobby-portrait')!
 const sprite=selectedClass==='shaman'?art.assets.shaman:art.assets.hero
 portrait.style.backgroundImage=`url("${import.meta.env.BASE_URL}${sprite.animations.stand.image}")`
 portrait.style.backgroundSize=`${192*sprite.animations.stand.frames*1.25}px ${192*((sprite.animations.stand as any).rows??1)*1.25}px`
 const currentExp=Number(player._exp?.()??0),floor=readNumber(player,'nobbyXpFloor'),next=readNumber(player,'nobbyXpNext')
 const earned=Math.max(0,currentExp-floor),needed=Math.max(1,next-floor)
 meter(xp,earned,needed,'EP')
 xp.title=`Stufe ${player._level()} → ${player._level()+1}: ${Math.max(0,next-currentExp)} EP fehlen`
 root.querySelector<HTMLElement>('.nobby-stats-xp')!.textContent=
   `EP dieser Stufe: ${Math.round(earned)} / ${Math.round(needed)} · Noch ${Math.max(0,Math.ceil(next-currentExp))} EP bis Stufe ${player._level()+1}`
 const points=readNumber(player,'nobbyPoints')
 pointsLabel.textContent=`Freie Attributpunkte: ${points}`
 statsButton.classList.toggle('has-points',points>0)
 for(const choice of choices){
    root.querySelector<HTMLElement>(`[data-stat-value="${choice.key}"]`)!.textContent=String(readNumber(player,choice.field))
    root.querySelector<HTMLButtonElement>(`button[data-stat="${choice.key}"]`)!.disabled=points<1||readNumber(player,choice.field)>=999
 }
 const id=String(engine.sceneMap.data()?.id??'').replace(/^map-/,'')
 region.textContent=worlds.find(w=>w.id===id)?.title??'Nobby World';gold.textContent=`${player._gold()} Gold`
}
