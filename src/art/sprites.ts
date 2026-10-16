import registry from './registry.json'
import {animationFrameIndices,trimTransparentBoundsFor} from './animation-policy.mjs'

export const ART=registry
export type AssetId=keyof typeof registry.assets

/** Native-sized sheets; the only transforms are fixed foot translation and mirror. */
export function spritesheets(){
    return Object.entries(registry.assets).filter(([_,asset])=>asset.kind!=='terrain').map(([id,asset])=>{
        const [width,height]=asset.frame,[footX,footY]=asset.foot,[boxW,boxH]=asset.hitbox
        // Keep a small set of geometrically stable standing poses while leaving
        // every walk, attack, cast, hit, death and summon frame intact.
        const textures=Object.fromEntries(Object.entries(asset.animations).map(([name,state])=>{
          const frames=animationFrameIndices(id,name,state.frames,(state as any).userEdited)
          return [name,{
            image:state.image,framesWidth:state.frames,framesHeight:(state as any).rows??1,
            animations:({direction}: {direction:string})=>[
                [...frames.map((frameX,index)=>({
                    time:(state as any).frameDurations?frames.slice(0,index).reduce((sum,f)=>sum+(state as any).frameDurations[f],0)*60/1000:index*60/state.fps,frameX,frameY:(state as any).directions?Math.max(0,(state as any).directions.indexOf(direction)):(state as any).rows===2&&direction==='up'?1:0,
                    scale:asset.directional&&(state as any).rows!==4&&direction==='left'?[-1,1]:[1,1]
                })),{time:(state as any).frameDurations?frames.reduce((sum,f)=>sum+(state as any).frameDurations[f],0)*60/1000:frames.length*60/state.fps}]
            ]
          }]
        }))
        return {id,image:asset.animations.stand.image,framesWidth:asset.animations.stand.frames,
            framesHeight:(asset.animations.stand as any).rows??1,anchor:[footX/width,footY/height],x:boxW/2,y:boxH,
            trimTransparentBounds:trimTransparentBoundsFor(asset.kind,(asset as any).editorBaseId||id),textures}
    })
}
