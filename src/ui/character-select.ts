import art from '../art/registry.json'
let dialog:HTMLDialogElement|undefined
let sentAt=0
let activeEngine:any
export function updateCharacterSelect(engine:any,player:any){
 activeEngine=engine
 const raw=player?.nobbyClass
 const selected=typeof raw==='function'?raw():raw
 if(!player||selected){if(dialog?.open)dialog.close();return}
 if(!dialog){
  dialog=document.createElement('dialog')
  dialog.id='nobby-character-select'
  dialog.setAttribute('aria-labelledby','class-title')
  dialog.innerHTML=`<small>NOBBY WORLD</small><h1 id="class-title">Dein Abenteuer beginnt</h1><p>Wähle deinen Weg. Deine Klasse bleibt in diesem Spielstand erhalten.</p><div class="nobby-class-cards">${[
   ['mage','Magier','hero','Meister der Arkankugel','Arkankugel · Heilung · 25 Mana'],
   ['shaman','Schamane','shaman','Hüter der alten Naturmagie','Skelett erwecken · 10 Mana · bis zu 3 Begleiter']
  ].map(([id,name,asset,description,ability])=>{
   const sprite=(art.assets as any)[asset]
   return `<button type="button" data-class="${id}"><span class="class-preview" style="--sheet:url('${import.meta.env.BASE_URL}${sprite.animations.stand.image}');--frames:${sprite.animations.stand.frames};--last:${-192*(sprite.animations.stand.frames-1)}px"></span><strong>${name}</strong><span>${description}</span><small>${ability}</small><b>Diesen Weg wählen</b></button>`
  }).join('')}</div><footer>← → Auswählen · Enter Bestätigen · Maus & Touch</footer>`
  document.body.append(dialog)
  dialog.addEventListener('cancel',e=>e.preventDefault())
  dialog.querySelectorAll<HTMLButtonElement>('[data-class]').forEach(button=>button.addEventListener('click',()=>{
   if(Date.now()-sentAt<500)return
   sentAt=Date.now()
   // Movement is locked until selection; processAction intentionally rejects
   // all actions in that state. Send this validated setup action directly.
   activeEngine.webSocket.emit('action',{action:'nobby:choose-class',data:{class:button.dataset.class}})
  }))
  dialog.addEventListener('keydown',e=>{
   if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
    e.preventDefault();e.stopPropagation()
    const cards=[...dialog!.querySelectorAll<HTMLButtonElement>('[data-class]')]
    const i=cards.indexOf(document.activeElement as HTMLButtonElement)
    cards[(i+1)%cards.length].focus()
   }
  })
 }
 if(!dialog.open){dialog.showModal();dialog.querySelector<HTMLButtonElement>('button')!.focus()}
}
