/** Pure 64px Tiled map-grid expansion; original tile IDs and coordinates are retained. */
export const EDITOR_TILE_SIZE=64
export const EDITOR_MAX_SIDE_TILES=128
export const EDITOR_MAX_TOTAL_TILES=6250 // 16 navigation cells per 64px tile, max 100k
export function validateMapExpansion(oldW,oldH,newW,newH){
 if(![oldW,oldH,newW,newH].every(Number.isInteger))return 'Kachelgrößen müssen ganze Zahlen sein.'
 if(oldW<=0||oldH<=0||newW<oldW||newH<oldH)return 'Die Karte kann nur nach rechts oder unten erweitert werden.'
 if(newW===oldW&&newH===oldH)return 'Breite oder Höhe erhöhen.'
 if(newW>EDITOR_MAX_SIDE_TILES||newH>EDITOR_MAX_SIDE_TILES||newW*newH>EDITOR_MAX_TOTAL_TILES)
  return 'Maximal 128 Kacheln pro Seite und 6.250 Kacheln insgesamt (Navigationslimit).'
 return null
}
/** Existing cells retain their exact tile id, new area is filled per layer. */
export function expandLayerGrid(gids,oldW,oldH,newW,newH,fill=0){
 const error=validateMapExpansion(oldW,oldH,newW,newH)
 if(error)throw Error(error)
 if(gids.length!==oldW*oldH)throw Error('Altes Raster unvollständig.')
 const out=new Array(newW*newH).fill(fill)
 for(let y=0;y<oldH;y++)for(let x=0;x<oldW;x++)
  out[y*newW+x]=gids[y*oldW+x]
 return out
}
/** Background water + collision, all decorative layers initially empty. */
export function expansionFill(layerName){
 if(layerName==='Wassergrund')return 73
 if(layerName==='Wasser und Klippen · Kollision')return 1
 return 0
}
