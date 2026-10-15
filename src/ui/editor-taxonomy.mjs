// Human labels for existing Tiled layers. The TMX layer names remain unchanged.
export const OBJECT_CATEGORIES=['Alle','Wald','Wasserobjekte','Felsen','Gebäude','Deko','Tiere','NPCs','Gegner','Portale']
export const TILE_CATEGORIES=['Alle','Gelände','Wasser','Wege','Brücken','Details']
const layers={
 'Wassergrund':['🌊 Wasserfläche (Hintergrund)','Unterste Ebene: Hier ist das Wasser unter der Insel. Gras und Erde malst du auf „Gelände“.'],
 'Uferwellen':['〰️ Uferwellen','Schaum und Wellen am Ufer. Nur Grafik, keine Sperre.'],
 'Gelände':['🌿 Gelände (Boden)','Gras, Erde, Sand und Inselboden. Für begehbares neues Land zusätzlich die Sperrfläche entfernen.'],
 'Wasser und Klippen · Kollision':['⛔ Sperrflächen (Logik)','Rote Felder sind gesperrt. Die neue Wasserfläche ist automatisch blockiert. Für neues Land diese Sperren entfernen.'],
 'Wege':['🟡 Wege und Pfade','Wege über dem Gelände; sie ändern die Begehbarkeit nicht automatisch.'],
 'Brücke':['🌉 Brücken','Sichtbare Brücken. Auch hier muss die Sperrfläche für einen Übergang frei sein.']
}
export const layerLabel=name=>layers[name]?.[0]??name
export const layerHelp=name=>layers[name]?.[1]??'Sichtbare Kachelebene aus Tiled'
export function objectCategory(id){
 if(id.startsWith('npc:'))return 'NPCs'
 if(id.startsWith('monster:'))return 'Gegner'
 if(id.startsWith('portal:'))return 'Portale'
 if(id.startsWith('tree-')||id==='bush')return 'Wald'
 if(id==='water-rock'||id==='foam')return 'Wasserobjekte'
 if(id==='rock'||id==='ore')return 'Felsen'
 if(id==='sheep')return 'Tiere'
 if(['house','house-large','barracks','monastery','tower','castle'].includes(id))return 'Gebäude'
 return 'Deko'
}
export function tilesetCategory(source){
 const value=String(source).toLowerCase()
 if(value.includes('water')||value.includes('foam'))return 'Wasser'
 if(value.includes('bridge'))return 'Brücken'
 if(value.includes('path-details'))return 'Details'
 if(value.includes('path'))return 'Wege'
 return 'Gelände'
}
export const layerForTileCategory=category=>({
 Gelände:'Gelände',Wasser:'Wassergrund',Wege:'Wege',Brücken:'Brücke',Details:'Wege'
})[category]??null
