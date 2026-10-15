export const ENEMIES=Object.freeze({
 ritter:{graphic:'enemy-warrior',name:'Ritter',biome:'Alle'},
 berserker:{graphic:'enemy-berserker',name:'Berserker',biome:'Alle'},
 scorpion:{graphic:'desert-scorpion',name:'Sandstachel-Skorpion',biome:'Wüste'},
 serpent:{graphic:'desert-serpent',name:'Dünenviper',biome:'Wüste'},
 'polar-bear':{graphic:'snow-polar-bear',name:'Frostpranke',biome:'Schnee'}
})
export const enemyGraphic=id=>ENEMIES[id]?.graphic??'enemy-warrior'
