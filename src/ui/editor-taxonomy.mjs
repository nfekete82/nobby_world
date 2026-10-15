// Human labels for existing Tiled layers. The TMX layer names remain unchanged.
export const OBJECT_CATEGORIES=['Alle','Wald','Wasserobjekte','Felsen','Gebäude','Deko','Tiere','NPCs','Gegner','Portale']
export const TILE_CATEGORIES=['Alle','Gelände','Wüste','Felsboden','Schnee','Wasser','Wege','Brücken','Details']
const layers={
 'Wassergrund':['🌊 Wasserfläche (Hintergrund)','Unterste Ebene: Hier ist das Wasser unter der Insel. Gras und Erde malst du auf „Gelände“.'],
 'Uferwellen':['〰️ Uferwellen','Schaum und Wellen am Ufer. Nur Grafik, keine Sperre.'],
 'Gelände':['🌿 Gelände (Boden)','Gras und Wiese. Wüste, Felsboden und Schnee sind eigene Ebenen, die du darüber malen kannst.'],
 'Wüste':['🏜️ Wüstensand','Sand auf eigener Ebene. Wege und Brücken können darüber liegen; mit Löschen entfernst du nur Sand.'],
 'Felsboden':['🪨 Steiniger Boden','Stein- und Kiesboden als eigene Ebene, unabhängig von Wegen und Brücken.'],
 'Schnee':['❄️ Schneeboden','Schnee als eigene Ebene, unabhängig von anderen Bodenarten.'],
 'Wasser und Klippen · Kollision':['⛔ Sperrflächen (Logik)','Rote Felder sind gesperrt. Die neue Wasserfläche ist automatisch blockiert. Für neues Land diese Sperren entfernen.'],
 'Wege':['🟡 Wege und Pfade','Wege über dem Gelände; sie ändern die Begehbarkeit nicht automatisch.'],
 'Brücke':['🌉 Brücken','Sichtbare Brücken. Auch hier muss die Sperrfläche für einen Übergang frei sein.']
}
export const layerLabel=name=>layers[name]?.[0]??name
export const layerHelp=name=>layers[name]?.[1]??'Sichtbare Kachelebene aus Tiled'
export function objectCategory(id){
 if(id.startsWith('desert-cactus')||id==='desert-prickly-pear')return 'Kakteen'
 if(['desert-house','desert-tent','desert-temple'].includes(id))return 'Gebäude'
 if(id==='desert-rock')return 'Felsen'
 if(id.startsWith('snow-pine'))return 'Wald'
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
 if(value.includes('desert-path')||value.includes('snow-path'))return 'Übergänge'
 if(value.includes('desert'))return 'Wüste'
 if(value.includes('rocky'))return 'Felsboden'
 if(value.includes('snow'))return 'Schnee'
 if(value.includes('water')||value.includes('foam'))return 'Wasser'
 if(value.includes('bridge'))return 'Brücken'
 if(value.includes('path-details'))return 'Details'
 if(value.includes('path'))return 'Wege'
 return 'Gelände'
}
export const layerForTileCategory=category=>({
 Gelände:'Gelände',Wüste:'Wüste',Felsboden:'Felsboden',Schnee:'Schnee',
 Wasser:'Wassergrund',Wege:'Wege',Brücken:'Brücke',Details:'Wege'
})[category]??null

// A palette tile always picks the matching edit layer, including in 'Alle'.
export function layerForTileset(source){
 const file=String(source).split('/').pop()?.toLowerCase()
 if(file==='desert-path.tsx'||file==='snow-path.tsx')return 'Wege'
 if(file==='foam.tsx')return 'Uferwellen'
 if(file==='water.tsx')return 'Wasser und Klippen · Kollision'
 return layerForTileCategory(tilesetCategory(source))
}

export const BIOMES=['Wald','Wüste','Schnee']
export const BIOME_TILE_CATEGORIES={
 Wald:['Alle','Gelände','Felsboden','Wege','Wasser','Brücken','Details'],
 Wüste:['Alle','Wüste','Wege','Übergänge','Wasser','Brücken','Details'],
 Schnee:['Alle','Schnee','Wege','Übergänge','Wasser','Brücken','Details']
}
export const BIOME_OBJECT_CATEGORIES={
 Wald:OBJECT_CATEGORIES,
 Wüste:['Alle','Kakteen','Gebäude','Felsen','Deko','NPCs','Gegner','Portale'],
 Schnee:['Alle','Wald','Gebäude','Felsen','Deko','NPCs','Gegner','Portale']
}
export function objectBiome(id){
 if(id.startsWith('desert-'))return 'Wüste'
 if(id.startsWith('snow-'))return 'Schnee'
 if(id.startsWith('npc:')||id.startsWith('monster:')||id.startsWith('portal:'))return 'Alle'
 return 'Wald'
}
export function tilesetBiome(source){
 const file=String(source).toLowerCase()
 if(file.includes('desert'))return 'Wüste'
 if(file.includes('snow'))return 'Schnee'
 if(file.includes('water')||file.includes('foam')||file.includes('bridge')||file.includes('path'))return 'Alle'
 return 'Wald'
}
export function visibleInBiome(assigned,selected){return assigned==='Alle'||assigned===selected}
