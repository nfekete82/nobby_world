// Keep artwork layers independent; only update an explicit logical collision grid.
export const COLLISION_LAYER='Wasser und Klippen · Kollision'
const WALKABLE=new Set(['Gelände','Wüste','Felsboden','Schnee','Wege','Brücke'])
export function walkabilityChanges(layers,index,layer,gid,automatic=true){
 if(!automatic||!gid||!WALKABLE.has(layer))return []
 const target=layers.find(x=>x.name===COLLISION_LAYER)
 if(!target||!Number.isInteger(index)||index<0||index>=target.gids.length||!target.gids[index])return []
 return [{name:COLLISION_LAYER,index,gid:0}]
}
// Explicit repair for existing painted bridges, paths and biome patches.
// Never unlock blank water or untouched shore tiles.
export function repairPaintedWalkways(layers){
 const collision=layers.find(x=>x.name===COLLISION_LAYER)
 if(!collision)return []
 const painted=['Wege','Brücke','Wüste','Felsboden','Schnee'].map(n=>layers.find(x=>x.name===n)).filter(Boolean)
 const changes=[]
 for(let i=0;i<collision.gids.length;i++)
  if(collision.gids[i]&&painted.some(x=>x.gids[i]))changes.push({name:COLLISION_LAYER,index:i,gid:0})
 return changes
}
